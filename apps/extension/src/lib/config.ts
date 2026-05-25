/**
 * Runtime config for the extension.
 *
 * After the 2026-05-25 pivot to client-side AI inference, the extension no
 * longer talks to a Pluck-operated API for inference. This URL is kept for
 * future endpoints that *do* live on the web app — e.g. /api/license/verify.
 *
 * `import.meta.env` values are baked at build time by WXT/Vite.
 */
export const WEB_APP_URL =
  (import.meta.env.WXT_API_URL as string | undefined) ?? 'https://pluck-eight.vercel.app';

export const LICENSE_VERIFY_URL = `${WEB_APP_URL}/api/license/verify`;
