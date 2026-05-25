# @pluck/extension

Chrome extension entrypoint for Pluck. Built with [WXT](https://wxt.dev) + React + TypeScript.

## Dev

From the **repo root**:

```bash
pnpm install
pnpm dev:extension
```

WXT will:

1. Build the extension to `apps/extension/.output/chrome-mv3-dev/`.
2. Watch for changes and reload.

Then in Chrome, go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `apps/extension/.output/chrome-mv3-dev/`.

The popup talks to the web API at `http://localhost:3000` by default. Run the web app in another terminal:

```bash
pnpm dev:web
```

To point the extension at a deployed API instead, set `WXT_API_URL` in `apps/extension/.env.local`.

## Entrypoints

| File                                | What it is                                            |
| ----------------------------------- | ----------------------------------------------------- |
| `src/entrypoints/popup/`            | Toolbar popup UI (React)                              |
| `src/entrypoints/content.ts`        | Injected into every page; hosts the element picker    |
| `src/entrypoints/background.ts`     | Service worker; proxies API calls                     |
| `src/picker/overlay.ts`             | Shadow-DOM element-picker overlay                     |
| `src/lib/dom-path.ts`               | DOM path computation for picked elements              |
| `src/lib/sanitize-html.ts`          | Page HTML sanitizer for the AI prompt                 |
| `src/lib/messages.ts`               | Typed cross-context message contracts                 |

## Notes

- Icons not yet committed — WXT will warn at build time, that's fine for now.
  Drop PNG files into `public/icon/{16,32,48,96,128}.png` to silence the warning.
- Manifest V3 service worker is short-lived; long-running work (scheduled scrapes)
  belongs in the cloud worker, not here.
