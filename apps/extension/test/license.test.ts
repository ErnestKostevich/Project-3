import { describe, it, expect } from 'vitest';
import {
  verifyLicense,
  verifyLicenseWithKey,
  isProFeatureAvailable,
  PRO_FEATURES,
  type LicensePayload,
} from '@/lib/license';

describe('verifyLicense (bundled key)', () => {
  // After `pnpm gen-license-keys` runs, the bundled public key is real.
  // verifyLicense (with no key override) now performs a full signature check.
  it('rejects a syntactically valid JWT signed by an unknown key', async () => {
    const fakeJwt =
      'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicGxhbiI6InBybyJ9.fake-signature';
    const res = await verifyLicense(fakeJwt);
    expect(res.valid).toBe(false);
    // Could fail on malformed signature decoding OR on signature mismatch —
    // either is correct behavior. What matters is it doesn't grant Pro.
  });

  it('rejects a malformed JWT', async () => {
    const res = await verifyLicense('not-a-jwt');
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toMatch(/malformed|three/i);
  });
});

describe('verifyLicenseWithKey — real ES256 round-trip', () => {
  it('accepts a JWT signed by the matching private key', async () => {
    const { publicJwk, jwt } = await issueTestLicense({
      sub: 'test@example.com',
      plan: 'pro',
      iat: Math.floor(Date.now() / 1000),
      v: 1,
    });
    const res = await verifyLicenseWithKey(jwt, publicJwk);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.payload.sub).toBe('test@example.com');
      expect(res.payload.plan).toBe('pro');
    }
  });

  it('rejects a JWT with a tampered payload', async () => {
    const { publicJwk, jwt } = await issueTestLicense({
      sub: 'test@example.com',
      plan: 'free',
      iat: Math.floor(Date.now() / 1000),
    });
    // Swap the payload portion with one claiming pro — should fail signature check.
    const parts = jwt.split('.');
    const tamperedPayload = b64urlEncode(
      new TextEncoder().encode(JSON.stringify({ sub: 'test@example.com', plan: 'pro' })),
    );
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const res = await verifyLicenseWithKey(tampered, publicJwk);
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toMatch(/signature/i);
  });

  it('rejects an expired JWT', async () => {
    const { publicJwk, jwt } = await issueTestLicense({
      sub: 'test@example.com',
      plan: 'pro',
      iat: Math.floor(Date.now() / 1000) - 100_000,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const res = await verifyLicenseWithKey(jwt, publicJwk);
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toMatch(/expired/i);
  });

  it('rejects a JWT with an unsupported alg', async () => {
    // Manually craft a "header" claiming HS256 — we only support ES256.
    const headerB64 = b64urlEncode(
      new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    );
    const payloadB64 = b64urlEncode(
      new TextEncoder().encode(JSON.stringify({ sub: 'x', plan: 'pro' })),
    );
    const malicious = `${headerB64}.${payloadB64}.signature`;
    // Use a real public key (so the check fails on alg, not on key load)
    const { publicJwk } = await issueTestLicense({
      sub: 'whatever',
      plan: 'free',
      iat: 0,
    });
    const res = await verifyLicenseWithKey(malicious, publicJwk);
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toMatch(/alg/i);
  });

  it('rejects a malformed (non-three-segment) JWT', async () => {
    const { publicJwk } = await issueTestLicense({ sub: 'x', plan: 'free', iat: 0 });
    const res = await verifyLicenseWithKey('not.a-jwt', publicJwk);
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toMatch(/malformed|three/i);
  });
});

describe('isProFeatureAvailable', () => {
  it('returns false with no license', () => {
    expect(isProFeatureAvailable('scheduledRuns', null)).toBe(false);
    expect(isProFeatureAvailable('sheetsExport', null)).toBe(false);
  });

  it('returns true for pro plan + listed feature', () => {
    expect(
      isProFeatureAvailable('scheduledRuns', { sub: 'x', plan: 'pro', iat: 1 }),
    ).toBe(true);
  });

  it('returns false for free plan', () => {
    expect(
      isProFeatureAvailable('scheduledRuns', { sub: 'x', plan: 'free', iat: 1 }),
    ).toBe(false);
  });
});

describe('PRO_FEATURES', () => {
  it('exposes expected feature flags', () => {
    expect(PRO_FEATURES.unlimitedJobs).toBe(true);
    expect(PRO_FEATURES.scheduledRuns).toBe(true);
    expect(PRO_FEATURES.sheetsExport).toBe(true);
    expect(PRO_FEATURES.webhookExport).toBe(true);
  });
});

// ── test helpers ────────────────────────────────────────────────────────────

async function issueTestLicense(
  payload: LicensePayload,
): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey; jwt: string }> {
  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  const header = { alg: 'ES256', typ: 'JWT' };
  const headerB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      keypair.privateKey,
      new TextEncoder().encode(signingInput) as BufferSource,
    ),
  );
  return {
    publicJwk,
    privateJwk,
    jwt: `${signingInput}.${b64urlEncode(sig)}`,
  };
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
