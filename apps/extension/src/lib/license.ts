/**
 * Offline JWT license validation.
 *
 * The license is an ES256 (ECDSA P-256 + SHA-256) JWT signed by the Polar
 * webhook handler in `apps/web/api/polar/webhook`. The extension bundles the
 * matching public key (committed as `LICENSE_PUBLIC_KEY` below).
 *
 * Verification happens entirely in the browser via Web Crypto. No network
 * call. This is intentional — the extension must work offline, and we don't
 * want a license-check endpoint to be a fail-open / fail-closed liability.
 *
 * Generating the keypair: see scripts/gen-license-keys.ts.
 * Signing a test license: see scripts/sign-test-license.ts.
 *
 * The matching private key lives in `apps/web/.env.local` (LICENSE_PRIVATE_KEY)
 * and is used by the webhook handler. Lose it = need to re-issue all licenses.
 * To rotate, run `pnpm gen-license-keys` again (every existing license becomes
 * invalid; you'll need to re-issue them).
 */

import type { ProviderId } from './ai/types';

export type Plan = 'free' | 'pro';

export interface LicensePayload {
  /** Subject — the email the license was issued to. */
  sub: string;
  /** Plan tier. */
  plan: Plan;
  /** Issued-at, ms epoch / 1000. */
  iat: number;
  /** Optional expiry. Pluck Pro is currently lifetime → no exp. */
  exp?: number;
  /** Optional version, in case we ship a v2 license format. */
  v?: number;
}

export type VerifyResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: string };

/**
 * Public key as a JWK. Generated with scripts/gen-license-keys.ts on 2026-05-25.
 *
 * The matching private key is held only by the web app (env var
 * LICENSE_PRIVATE_KEY). Rotating: re-run `pnpm gen-license-keys` and commit
 * the updated file. Doing so invalidates every existing license — only do
 * this if the private key has been compromised.
 */
const LICENSE_PUBLIC_KEY: JsonWebKey = {
  "key_ops": [
    "verify"
  ],
  "ext": true,
  "kty": "EC",
  "x": "SygjMlYiKpelMb5MzZChwNkPHn9urhj2OfjnbYC0nkY",
  "y": "9w69XRxubKUjPBEMt7JzO3gB6slUiWfOxwD-eXrSs6A",
  "crv": "P-256",
  "alg": "ES256",
  "use": "sig"
};

const PLACEHOLDER_X = 'PLACEHOLDER_X_REPLACE_WITH_REAL_PUBKEY_BEFORE_LAUNCH';

export async function verifyLicense(jwt: string): Promise<VerifyResult> {
  if (LICENSE_PUBLIC_KEY.x === PLACEHOLDER_X) {
    // Dev mode: refuse to verify anything until a real key is committed.
    // The settings UI surfaces this so dev users aren't confused.
    return {
      valid: false,
      reason:
        'License verification is disabled: a real public key has not been committed yet. Run `pnpm gen-license-keys` and commit the result.',
    };
  }
  return verifyLicenseWithKey(jwt, LICENSE_PUBLIC_KEY);
}

/**
 * Pure verification function — takes the public JWK as a parameter so it's
 * easy to test with a generated keypair. The bundled `verifyLicense` wraps
 * this with the committed public key + placeholder-mode safeguard.
 */
export async function verifyLicenseWithKey(
  jwt: string,
  publicKey: JsonWebKey,
): Promise<VerifyResult> {
  const trimmed = jwt.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'License is malformed (expected three dot-separated parts).' };
  }
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(b64urlDecodeToString(headerB64));
  } catch {
    return { valid: false, reason: 'License header is not valid JSON.' };
  }
  if (header.alg !== 'ES256') {
    return { valid: false, reason: `Unsupported license algorithm: ${header.alg ?? '(none)'}` };
  }

  let payload: LicensePayload;
  try {
    payload = JSON.parse(b64urlDecodeToString(payloadB64));
  } catch {
    return { valid: false, reason: 'License payload is not valid JSON.' };
  }

  if (payload.exp != null && payload.exp * 1000 < Date.now()) {
    return { valid: false, reason: 'License has expired.' };
  }

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'jwk',
      publicKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
  } catch (err) {
    return {
      valid: false,
      reason: `Public key is invalid: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = b64urlDecodeToBytes(sigB64);

  // The `as BufferSource` casts work around a TS 5.7 strictness wart where
  // Uint8Array<ArrayBufferLike> isn't structurally assignable to
  // Uint8Array<ArrayBuffer>. Runtime behavior is unaffected.
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    signature as BufferSource,
    signingInput as BufferSource,
  );

  if (!ok) return { valid: false, reason: 'License signature is invalid.' };
  return { valid: true, payload };
}

// ── Feature gating ──────────────────────────────────────────────────────────

const PRO_FEATURES = {
  unlimitedJobs: true,
  scheduledRuns: true,
  sheetsExport: true,
  webhookExport: true,
  multipleProviders: true,
} as const;

export type ProFeature = keyof typeof PRO_FEATURES;

export function isProFeatureAvailable(
  feature: ProFeature,
  license: LicensePayload | null,
): boolean {
  if (!license) return false;
  return license.plan === 'pro' && PRO_FEATURES[feature];
}

// ── base64url helpers ───────────────────────────────────────────────────────

function b64urlDecodeToString(s: string): string {
  return new TextDecoder().decode(b64urlDecodeToBytes(s));
}

function b64urlDecodeToBytes(s: string): Uint8Array {
  // Pad to multiple of 4 and convert URL-safe to standard base64.
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Re-export for the options page so it can show "Unlock scheduling" copy correctly.
export { type Plan as LicensePlan };
export { PRO_FEATURES };
// ProviderId isn't used here but exported by the lib barrel — keep import live.
void (null as unknown as ProviderId);
