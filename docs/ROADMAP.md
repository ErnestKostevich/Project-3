# Roadmap

Phased build plan from empty repo to first paying customers. Dates are working estimates; the milestones matter more than the calendar.

## Phase 0 — Foundation (week 1)

**Goal:** repo is buildable, both apps boot, scaffolding is in place.

- [x] Monorepo (pnpm workspaces, shared tsconfig, prettier)
- [x] Project docs (vision, architecture, roadmap)
- [ ] `apps/extension` — WXT + React skeleton, popup + content script
- [ ] `apps/web` — Next.js 15 skeleton, landing + dashboard placeholder, `/api/infer` route stub
- [ ] `packages/shared` — type definitions for API contracts
- [ ] End-to-end mock: extension picker → POST `/api/infer` (mocked response) → results rendered in popup

**Exit criteria:** I can install the unpacked extension, click a few elements on `example.com`, see mocked structured output in the popup, all locally without any external services.

## Phase 1 — Real AI inference (weeks 2–3)

**Goal:** replace the mock with a real Claude-powered pattern-inference loop.

- [ ] Anthropic SDK integration in `apps/web`
- [ ] Real `/api/infer` implementation (with prompt caching)
- [ ] Page-HTML sanitization (strip scripts, comments, irrelevant attrs to fit context budget)
- [ ] Local selector-validation in extension (highlight matches before confirming)
- [ ] "Refine pick" loop — user can add/remove example elements and the suggestion updates

**Exit criteria:** on 5 different real-world sites (e-commerce listing, directory, blog index, search-results page, job board) the AI proposes a usable schema on the first or second iteration.

## Phase 2 — Save and re-run (weeks 4–5)

**Goal:** scrape jobs persist; user can re-run them later.

- [ ] Clerk auth in `apps/web` + extension (token bridge)
- [ ] Neon + Drizzle ORM setup, migrations for `users`, `jobs`, `runs`, `rows`
- [ ] `POST /api/jobs` — save a job (URL + schema + pagination hint)
- [ ] `POST /api/jobs/:id/run` — re-run on demand from the user's browser (extension performs the scrape locally)
- [ ] Dashboard view: list of jobs, run history, view rows, download as CSV
- [ ] Pagination handling (next-link follower, "load more" button clicker)

**Exit criteria:** a user can create a job today, come back tomorrow, hit "run", and get fresh data in CSV.

## Phase 3 — Cloud scheduling (weeks 6–8)

**Goal:** jobs run automatically on a schedule, in the cloud, without the user's browser open.

- [ ] `apps/worker` — Node service with Playwright browser pool
- [ ] Job queue (BullMQ on Redis, or Inngest)
- [ ] Residential proxy integration (Bright Data or Smartproxy)
- [ ] CAPTCHA solver integration (CapMonster, 2captcha) — only as fallback
- [ ] Cron scheduling in dashboard
- [ ] Notifications (email on job failure)

**Exit criteria:** a job set to "every 6 hours" runs reliably for 7 days unattended across at least 10 different target sites.

## Phase 4 — Integrations and billing (weeks 9–11)

**Goal:** users can route output where they need it, and pay for the service.

- [ ] Google Sheets export (OAuth, append-on-run)
- [ ] Webhook delivery (POST rows to user-provided URL with HMAC signature)
- [ ] Airtable integration
- [ ] Stripe Checkout for subscription tiers
- [ ] Metered usage tracking (rows scraped per period)
- [ ] Free-tier gating (100 rows/mo, manual runs only)

**Exit criteria:** a user can sign up, hit the free-tier limit, upgrade to paid via Stripe, and have rows automatically appended to their Google Sheet.

## Phase 5 — Launch (week 12)

**Goal:** first 100 paying customers.

- [ ] Public landing page (clear positioning, demo video, pricing)
- [ ] Chrome Web Store submission (allow 1–2 weeks for review)
- [ ] Product Hunt launch
- [ ] Cold outreach to 50 target users (recruiters, e-commerce operators)
- [ ] 3 case-study posts on the blog

**Exit criteria:** $5k MRR.

## Phase 6+ — Beyond MVP

Not commitments, just candidates ordered by gut-feel ROI:

- Team plans (seat-based pricing, shared jobs)
- Notion / HubSpot / Pipedrive integrations
- API access (programmatic job creation)
- Browser fingerprint rotation for harder sites
- Public API to run a one-shot scrape from a curl request
- Marketplace of pre-built job templates for popular sites
- Firefox and Edge support
- Self-serve enterprise tier (SSO, audit log, SLA)

## What we are explicitly NOT building

- A general-purpose browser automation tool (Cursor / Replit / Bardeen own that)
- A no-code workflow builder (Zapier owns that; we'll integrate with them instead)
- A data marketplace (separate business model, separate problem)
- An "AI agent" that does multi-step research — too broad, and we'd lose the wedge
