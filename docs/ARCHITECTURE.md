# Architecture

## High-level

```
┌─────────────────────────┐      ┌────────────────────────────┐
│  Chrome Extension       │      │  Web App (Next.js)         │
│  (apps/extension)       │      │  (apps/web)                │
│                         │      │                            │
│  - Element picker UI    │◄────►│  - Landing page            │
│  - Selection capture    │ HTTPS│  - Auth (Clerk)            │
│  - Auth token storage   │      │  - Dashboard               │
│  - Triggers scrapes     │      │  - API routes              │
└─────────────────────────┘      │    /api/infer              │
                                 │    /api/jobs               │
                                 │    /api/runs               │
                                 │  - Stripe webhooks         │
                                 └─────────────┬──────────────┘
                                               │
                                               ▼
                                 ┌────────────────────────────┐
                                 │  Postgres (Neon)           │
                                 │  - users, jobs, runs,      │
                                 │    rows, integrations      │
                                 └────────────────────────────┘
                                               │
                                               ▼
                                 ┌────────────────────────────┐
                                 │  Worker (TBD)              │
                                 │  - Playwright browser pool │
                                 │  - Residential proxies     │
                                 │  - CAPTCHA solver          │
                                 │  - Pagination + retries    │
                                 └────────────────────────────┘
```

## Components

### `apps/extension` — Chrome Extension

- **Framework:** [WXT](https://wxt.dev) + React + TypeScript + Tailwind.
- **Entrypoints:**
  - `popup` — main UI: list of jobs, "New scrape" button, status of recent runs.
  - `content` — injected into pages. Renders the element-picker overlay, captures user clicks, snapshots relevant DOM.
  - `background` — service worker. Holds session, proxies API calls, manages tab state.
- **Manifest:** MV3.
- **Permissions (minimal):** `activeTab`, `storage`, `scripting`, host permissions granted per-site at install or runtime.

### `apps/web` — Web App

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4.
- **Surfaces:**
  - `/` — marketing landing page.
  - `/dashboard` — authenticated app: jobs list, run history, integrations, billing.
  - `/api/*` — REST endpoints called by both the extension and the dashboard.
- **Auth:** Clerk (handles social/email/magic-link out of the box).
- **Payments:** Stripe (subscriptions + metered billing for over-cap rows).
- **DB client:** Drizzle ORM on Neon Postgres.
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`) with prompt caching for repeated page templates.

### `packages/shared`

Pure TypeScript types and small utilities used by both apps. No runtime dependencies. Compiled by each consumer.

### Worker (future, not in MVP)

Standalone Node service that runs scheduled scrape jobs. Will live in `apps/worker` when introduced. Options under consideration:

- **Self-host on Fly.io** with Playwright + residential proxy provider (Bright Data, Smartproxy).
- **Use Browserbase / Apify Actors** as the browser runtime and just wrap it.

For MVP we'll run scrapes **on demand from the extension itself** (the user's own browser tab does the work) and only stand up the cloud worker when we ship scheduled runs in Phase 2.

## Data model (initial)

```
users           id, clerk_id, email, plan, rows_used_this_period, created_at
jobs            id, user_id, name, url, schema_json, schedule_cron, paused, created_at
job_versions    id, job_id, selectors_json, pagination_json, created_at
runs            id, job_id, status, started_at, finished_at, row_count, error
rows            id, run_id, data_json, source_url, scraped_at
integrations    id, user_id, type (sheets|webhook|airtable), config_json, secret_ref
```

Drizzle migrations live in `apps/web/drizzle/`.

## The AI inference flow

When the user picks elements on a page, the extension sends:

```ts
POST /api/infer
{
  url: string,
  pageHtml: string,        // trimmed / sanitized to fit token budget
  picks: Array<{
    domPath: string,        // e.g. "div.list > article:nth-child(3) > h2 > a"
    sampleText: string,
    sampleHtml: string,
    label?: string,         // user-typed column name, optional
  }>
}
```

The server prompt is structured as:

1. **System:** "You are a web-scraping assistant. Given a page and example elements the user clicked, infer the repeating-container pattern and column selectors."
2. **User:** sanitized HTML + JSON of picks.
3. **Assistant response (JSON):**

```ts
{
  containerSelector: string,
  columns: Array<{
    label: string,
    selector: string,      // relative to container
    attribute?: "text" | "href" | "src" | string,
    transform?: "trim" | "number" | "url" | "date",
  }>,
  paginationHint?: {
    type: "next-link" | "infinite-scroll" | "page-numbers" | "none",
    selector?: string,
  },
  confidence: number,
  sampleRows: Array<Record<string, string>>,  // 3-5 example rows extracted using the proposed selectors
}
```

The extension validates the proposal by running the selectors locally and highlighting matches before the user confirms. This way the AI is a *suggester*, not a final authority — selector logic is grounded in the live DOM.

**Prompt caching** is essential: a single page template (e.g. an entire LinkedIn search-results page HTML) can be 50k+ tokens. We cache the page HTML so each refinement-iteration costs only the small delta.

## Deployment

| Component        | Where                                  |
| ---------------- | -------------------------------------- |
| Next.js web      | Vercel                                 |
| Postgres         | Neon                                   |
| Extension        | Chrome Web Store (eventually Edge/FF)  |
| Auth             | Clerk                                  |
| Payments         | Stripe                                 |
| AI               | Anthropic API                          |
| Error monitoring | Sentry                                 |
| Product analytics| PostHog                                |
| Worker (later)   | Fly.io or Railway, with Bright Data    |

## Open questions

- **Anti-bot:** for protected sites (Cloudflare, DataDome), do we proxy through Browserbase/ScrapingBee or build the stack ourselves? Build is cheaper at scale, buy is faster to ship — start with buy.
- **Pricing-page rows vs. records:** "row" is ambiguous — does a paginated scrape that returns 10k items count as 10k rows, or 1 row per page × 100 pages? Lean toward records = rows for simplicity.
- **Extension distribution:** Chrome Web Store review can be slow and unpredictable; have a fallback "side-load from website" path documented for paying users.
