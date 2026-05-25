/**
 * Runtime config for the extension.
 * `import.meta.env` values are baked at build time by WXT/Vite.
 */
export const API_BASE_URL =
  (import.meta.env.WXT_API_URL as string | undefined) ?? 'http://localhost:3000';
