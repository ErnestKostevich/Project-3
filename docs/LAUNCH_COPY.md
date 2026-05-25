# Launch copy — ready-to-paste

Drafts for every channel. Edit before posting — these are starting points, not finals.

## Chrome Web Store

### Short description (132 chars max)

> Click anything on any page, get a clean table. AI-powered web scraper for non-coders. Free with Chrome built-in AI, $29 lifetime Pro.

### Detailed description

```
Pluck turns any webpage into structured data — by clicking on it.

The existing web-scraping tools (Octoparse, ParseHub, Apify) were built for engineers: CSS selectors, XPath, regular expressions, broken scripts when the site changes. Pluck is built for the marketer, recruiter, SDR, or e-commerce operator who needs the data this week, not next sprint.

HOW IT WORKS

1. Click the Pluck icon on any page.
2. Click a few examples of the data you want — a product name, a price, a profile link.
3. Pluck's AI looks at your picks and infers selectors for every other row on the page.
4. It validates the proposal against the live page and highlights every match in green.
5. Save the job, schedule it, or just download as CSV. Re-run any time.

ZERO RECURRING COST

Pluck runs AI inference on YOUR machine, not on a server we pay for. Choose:

• Chrome's built-in AI (free, on-device, no API key required — Chrome 127+)
• Your own Anthropic, Gemini, or OpenAI key (BYOK — your bill, not ours)

That's why Pluck Pro is a one-time $29 lifetime license, not a subscription. We don't have monthly costs to pass on.

PRO FEATURES ($29 lifetime, no recurring)

• Unlimited saved jobs (free is capped at 3)
• Scheduled runs (every 5m to 24h)
• Webhook delivery with HMAC signatures
• Multi-page pagination

GOOD TO KNOW

• Pluck works on any site you can already see in your browser — it doesn't bypass logins, paywalls, or anti-bot systems.
• Scheduled runs fire while Chrome is open (a cloud-worker option is on the roadmap as a paid Business tier).
• Your data never leaves your machine unless you configure a webhook export.

PRIVACY

Pluck has no server in the data path. Your saved jobs live in chrome.storage. Your API keys never leave your browser. Pro licenses are verified offline — no phone home. Full privacy policy at pluck.app/privacy.

14-day full refund, no questions asked.
```

### Justifications for permissions (Chrome submission form)

- **activeTab**: required to inject the element-picker overlay into the page the user is viewing when they click "Start picker"
- **scripting**: required to execute the saved-job runner on a hidden tab when re-running a scrape
- **storage**: saved jobs, settings, API keys, and license JWT are persisted to chrome.storage.local — never to any external server
- **alarms**: powers the scheduled-runs feature (Pro). Fires periodic re-runs of saved jobs
- **tabs**: opens hidden tabs to execute saved scrape jobs without disrupting the user's current browsing
- **<all_urls>** host permission: the picker must work on whichever site the user opens it on; we don't know in advance which sites they care about

## Product Hunt

### Tagline (60 chars max)

> Click anything on any page. Get a clean table. No code.

### Maker comment (post on launch day)

```
Hey Product Hunt 👋

I built Pluck because every couple of months I'd need to extract "all the X on Y page" for one project or another, and every existing tool (Octoparse, ParseHub, Apify, Bardeen) felt like overkill for non-coders and too clunky for me. They were all built before LLMs.

Pluck flips the experience: you click on a few examples, an LLM figures out the pattern, the extension validates it on the live DOM and highlights every match in green before you save. Three clicks from "I need this data" to a CSV.

The interesting part: Pluck has zero recurring cost to me. The AI runs in YOUR browser, either via Chrome's built-in Gemini Nano (free, no key) or your own Anthropic/Gemini/OpenAI key. So Pro is a one-time $29 lifetime license — no subscription, no monthly fight with churn.

Caveats up front:
• Scheduled runs need Chrome open (a cloud-worker Business tier is on the roadmap)
• It's pre-alpha — first 100 users will find bugs, and I'll fix them fast

14-day full refund, no questions.

Would love feedback, edge cases, weird sites that break it. Built solo, ship-or-die mode.

—Ernest
```

## X / Twitter launch thread

### Tweet 1

```
Most web-scraping tools were built before LLMs.

You learned XPath, wrote brittle scripts, and re-wrote them every time the site changed.

I built Pluck: click on a few examples, AI figures out the rest.

🧵 ↓
```

### Tweet 2

```
Step 1: click the Pluck icon on any page.
Step 2: click a few example data points.
Step 3: AI proposes selectors. Extension highlights every matching row in green before you save.
Step 4: download CSV / send to webhook / schedule.

[demo GIF]
```

### Tweet 3

```
The unusual part: Pluck has zero recurring cost to me.

AI runs in YOUR browser:
• Chrome's built-in Gemini Nano (free, no key)
• Or your own Anthropic / Gemini / OpenAI key (BYOK)

That's why Pro is one-time $29 — no subscription, ever.
```

### Tweet 4

```
What's the catch?

Scheduled runs need Chrome open. A cloud-worker option will land as a paid Business tier later — funded by revenue, not by me up-front.

For everything else, you get what you pay for once. No upgrade tier creep.
```

### Tweet 5

```
14-day full refund, no questions.

Pre-alpha — first 100 users will hit bugs, and I'll fix them fast.

→ pluck.app
```

## Hacker News — Show HN

### Title

```
Show HN: Pluck — AI-powered visual web scraper (Chrome extension, BYOK)
```

### Description

```
Hey HN. I built a Chrome extension where you click on example data on any page, and an LLM infers the selector pattern for everything like it on the page. The extension validates the proposal against the live DOM and highlights every match in green before you save. Save the job, re-run it, export to CSV, or send to a webhook.

The interesting architecture trick: Pluck has zero recurring cost to me. AI inference runs in the user's browser using either Chrome's built-in Gemini Nano (free, on-device) or the user's own API key (Anthropic, Gemini, OpenAI). No Pluck server in the data path. License verification is offline (signed JWT). That lets Pro be a one-time $29 lifetime license instead of yet another subscription.

Stack:
- Chrome MV3 extension (WXT + React + TS)
- AI provider adapter pattern (3 providers, easy to add more)
- chrome.storage for jobs + settings
- chrome.alarms for scheduling (Pro)
- HMAC-SHA256-signed webhooks for export (Pro)
- Web app on Vercel for landing + license endpoints (Polar.sh checkout, Standard Webhooks for signature verification, Resend for license-delivery email)
- All open-source: https://github.com/ErnestKostevich/Project-3

Pre-alpha but end-to-end functional. 57 unit tests passing. 14-day refund.

Would love feedback on:
- The pricing model (is "one-time lifetime" actually attractive vs subscription, or am I leaving money on the table?)
- Sites where the picker breaks (the AI gets confused; refinement loop usually fixes it)
- What you'd want as a "Business tier" feature (cloud worker is the obvious one)
```

## Indie Hackers post

### Title

```
I shipped a Chrome extension that costs me $0/month to run, even at scale. Here's the architecture.
```

### Body (excerpt — flesh out before posting)

```
TL;DR: I built Pluck, an AI-powered visual web scraper, and engineered it so my fixed monthly cost is literally $0 — even if 10,000 people use it.

The trick: AI inference runs in the user's browser, paid by them. Either through Chrome's built-in Gemini Nano (no API key needed, runs on-device) or via BYOK (their own Anthropic / Gemini / OpenAI key). Pluck never holds an LLM key on a server I pay for.

That removes the biggest fixed cost (API calls), which lets me:
- Price Pro as $29 one-time instead of $29/month
- Skip the entire "we need to acquire $X in MRR to be profitable" math
- Sleep at night

What it cost me to launch:
- $5 (Chrome Web Store dev fee)
- $0 hosting (Vercel free tier)
- $0 database (chrome.storage)
- $0 emails (Resend free tier)
- $0 payments setup (Polar.sh is fee-per-transaction)

Total: $5.

The architecture (open source on GitHub) ...
```

## Cold outreach template

### Subject

```
Saw your post about [specific data project] — want to try a tool that does it in 5 minutes?
```

### Body

```
Hi [name],

Saw your post about [specific thing]. I built a Chrome extension called Pluck that turns "click on a few examples → get a clean CSV" — no XPath, no Python, no broken scripts when the site changes.

Took 5 minutes to pull [relevant example] for a friend last week. Free to try (14-day refund on Pro if you need scheduling or integrations): [link]

If it works for your use case, great. If not, no hard feelings — would love to know what broke.

— Ernest
```

## Demo content ideas

Things to demo on screenshots / GIFs:

1. **Hacker News front page** — universal, everyone recognizes it. Pick title + points + author → table.
2. **A Shopify product category page** — speaks to e-commerce buyers.
3. **A LinkedIn company directory** (with the caveat that LinkedIn has anti-scraping; document this).
4. **A job board** — speaks to recruiters.
5. **Google Scholar results** — speaks to researchers/academics.

Screenshot ratios for Chrome Web Store:

- 1280×800 or 640×400 — large promo tiles
- Marquee: 1400×560
- Small promo: 440×280
- Screenshots: 1280×800 (up to 5)

Capture in light mode with a clean browser (no other extensions visible). Highlight the picker overlay's green-match outlines on a busy real page.
