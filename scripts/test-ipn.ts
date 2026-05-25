/**
 * Simulate a NOWPayments IPN callback to /api/nowpayments/ipn so we can
 * verify the full chain end-to-end without spending real crypto:
 *
 *   - signature verification works with the production IPN secret
 *   - license JWT minting works
 *   - Resend email delivery succeeds (license arrives in inbox)
 *
 * Usage:
 *
 *   pnpm tsx scripts/test-ipn.ts
 *
 * Reads NOWPAYMENTS_IPN_SECRET from apps/web/.env.local. The target URL is
 * production (the deployed Vercel app) — change BASE_URL below to hit a
 * preview deploy or localhost.
 */

import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const ENV_PATH = resolve(REPO_ROOT, 'apps/web/.env.local');

const BASE_URL = process.env.PLUCK_BASE_URL ?? 'https://pluck-eight.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'ernest2011kostevich@gmail.com';

async function main() {
  const env = await readFile(ENV_PATH, 'utf-8').catch(() => '');
  const m = env.match(/^NOWPAYMENTS_IPN_SECRET=(.+)$/m);
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET ?? m?.[1];
  if (!ipnSecret) {
    console.error(
      `NOWPAYMENTS_IPN_SECRET not found in env or ${ENV_PATH}. Add it locally:`,
    );
    console.error(`  echo 'NOWPAYMENTS_IPN_SECRET="..."' >> ${ENV_PATH}`);
    process.exit(1);
  }

  const orderId = `pluck-pro-${encodeURIComponent(TEST_EMAIL)}-${Date.now()}`;

  // Build a realistic IPN payload. NOWPayments sends a payment_status of
  // "finished" when the on-chain transaction is fully confirmed.
  const payload = {
    payment_id: 1234567890,
    payment_status: 'finished' as const,
    pay_address: 'test-address-0xfake',
    price_amount: 29,
    price_currency: 'usd',
    pay_amount: 0.000123,
    pay_currency: 'btc',
    order_id: orderId,
    order_description: `Pluck Pro lifetime license for ${TEST_EMAIL}`,
    purchase_id: 'test-purchase-id',
    outcome_amount: 28.92,
    outcome_currency: 'usd',
  };

  const sortedJson = JSON.stringify(sortKeysDeep(payload));
  const signature = await hmacSha512Hex(ipnSecret, sortedJson);

  console.log('→ POST', `${BASE_URL}/api/nowpayments/ipn`);
  console.log('  order_id:', orderId);
  console.log('  signature:', signature.slice(0, 32) + '…');

  const res = await fetch(`${BASE_URL}/api/nowpayments/ipn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nowpayments-sig': signature,
    },
    body: sortedJson,
  });

  console.log('← status:', res.status);
  console.log('← body  :', await res.text());
  console.log('');
  if (res.ok) {
    console.log(`✓ If RESEND_API_KEY is set on the server, ${TEST_EMAIL} should now have the license email.`);
  }
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await webcrypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await webcrypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) sorted[k] = sortKeysDeep(o[k]);
    return sorted;
  }
  return v;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
