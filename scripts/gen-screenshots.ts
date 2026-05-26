/**
 * Generate Chrome Web Store screenshots (1280x800 PNG).
 *
 * These are composited UI mockups (SVG → PNG via sharp) that faithfully
 * represent the extension's actual UI. They're not literal screenshots,
 * but they accurately show what the user sees — CWS accepts marketing
 * mockups as long as they're truthful.
 *
 * Outputs to docs/cws-assets/screenshot-{1..3}-*.png
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../docs/cws-assets');

const W = 1280;
const H = 800;

// Shared SVG defs (gradients, filters) — paste into each screenshot template.
const DEFS = `
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0c"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="55%">
      <stop offset="0%" stop-color="rgba(99,102,241,0.35)"/>
      <stop offset="100%" stop-color="rgba(99,102,241,0)"/>
    </radialGradient>
    <radialGradient id="cherry" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="60%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </radialGradient>
    <linearGradient id="leaf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#86efac"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <filter id="dropshadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

// Tiny cherry mark for the corner watermark and popup brand.
const cherryMark = (x: number, y: number, scale: number) => `
  <g transform="translate(${x},${y}) scale(${scale})">
    <path d="M 50 78 Q 56 50 64 30" stroke="#84cc16" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 80 80 Q 72 56 64 30" stroke="#84cc16" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 64 30 Q 84 18 92 32 Q 84 40 64 30 Z" fill="url(#leaf)"/>
    <circle cx="46" cy="86" r="20" fill="url(#cherry)"/>
    <circle cx="84" cy="92" r="20" fill="url(#cherry)"/>
    <ellipse cx="40" cy="79" rx="6" ry="4" fill="rgba(255,255,255,0.55)" transform="rotate(-25 40 79)"/>
    <ellipse cx="78" cy="85" rx="6" ry="4" fill="rgba(255,255,255,0.55)" transform="rotate(-25 78 85)"/>
  </g>`;

// ── Screenshot 1: Picker in action on a list page ─────────────────────────

const screenshot1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  ${DEFS}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Browser window -->
  <g transform="translate(80, 60)">
    <rect width="1120" height="700" rx="12" fill="#0f1115" stroke="rgba(255,255,255,0.08)" stroke-width="1" filter="url(#dropshadow)"/>

    <!-- Browser chrome -->
    <rect width="1120" height="48" rx="12" fill="#1a1d24"/>
    <rect y="36" width="1120" height="12" fill="#1a1d24"/>
    <circle cx="22" cy="24" r="6" fill="#fb7185"/>
    <circle cx="42" cy="24" r="6" fill="#fbbf24"/>
    <circle cx="62" cy="24" r="6" fill="#34d399"/>
    <rect x="90" y="13" width="600" height="22" rx="11" fill="#0a0a0c" stroke="rgba(255,255,255,0.06)"/>
    <text x="106" y="28" font-family="Inter, system-ui, sans-serif" font-size="12" fill="#737373">🔒  news.example.com</text>

    <!-- Page content (HN-like list) -->
    <text x="40" y="92" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600" fill="#737373" letter-spacing="2">TOP STORIES</text>

    <!-- Rows: outlined for green pick example or matched -->
    ${[
      { i: 1, title: 'Show HN: Pluck — AI visual web scraper', score: '294', host: 'pluck.app · 4h', sel: 'pick' },
      { i: 2, title: 'How we built a $0/month SaaS', score: '142', host: 'pluck.app · 6h', sel: 'pick' },
      { i: 3, title: 'AI replaces Octoparse for ops teams', score: '88', host: 'medium.example · 8h', sel: 'match' },
      { i: 4, title: 'Inside the zero-cost architecture', score: '67', host: 'pluck.app · 11h', sel: 'match' },
      { i: 5, title: 'Goodbye XPath, hello LLMs', score: '203', host: 'substack.example · 14h', sel: 'match' },
      { i: 6, title: 'Why we picked crypto-only checkout', score: '54', host: 'pluck.app · 1d', sel: 'match' },
    ]
      .map(
        (row, idx) => `
        <g transform="translate(40, ${110 + idx * 56})">
          <rect width="660" height="48" rx="6"
            fill="${row.sel === 'pick' ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.015)'}"
            stroke="${row.sel === 'pick' ? '#10b981' : row.sel === 'match' ? '#10b981' : 'rgba(255,255,255,0.06)'}"
            stroke-width="${row.sel === 'pick' ? '2' : '1.5'}"
            stroke-dasharray="${row.sel === 'match' ? '5,3' : '0'}"/>
          <text x="14" y="20" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#525252">${row.i}.</text>
          <text x="36" y="20" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#f5f5f5">${row.title}</text>
          <text x="36" y="38" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#737373">${row.score} pts · ${row.host}</text>
        </g>`,
      )
      .join('')}

    <!-- Pluck toolbar overlay (right side) -->
    <g transform="translate(740, 90)" filter="url(#dropshadow)">
      <rect width="320" height="580" rx="14" fill="rgba(15,17,21,0.96)" stroke="rgba(255,255,255,0.12)"/>

      <!-- Header -->
      ${cherryMark(14, 14, 0.16)}
      <text x="46" y="36" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="700" fill="#f5f5f5">Pluck</text>
      <text x="240" y="36" font-family="ui-monospace, monospace" font-size="11" fill="#10b981" text-anchor="end">● 6 rows · 98%</text>

      <!-- Container selector code -->
      <rect x="14" y="56" width="292" height="28" rx="4" fill="rgba(255,255,255,0.04)"/>
      <text x="22" y="74" font-family="ui-monospace, monospace" font-size="11" fill="#a5b4fc">tr.athing</text>

      <!-- Mini preview table -->
      <text x="14" y="106" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="600" fill="#737373" letter-spacing="2">PREVIEW · 6 ROWS</text>

      ${[
        ['Show HN: Pluck — AI…', '294'],
        ['How we built a $0/mo…', '142'],
        ['AI replaces Octoparse', '88'],
        ['Inside the zero-cost…', '67'],
        ['Goodbye XPath, hello…', '203'],
        ['Why we picked crypto-…', '54'],
      ]
        .map(
          ([t, s], idx) => `
          <g transform="translate(14, ${122 + idx * 26})">
            <text font-family="Inter, system-ui, sans-serif" font-size="11" fill="#cbd5e1">${t}</text>
            <text x="292" y="0" font-family="ui-monospace, monospace" font-size="11" fill="#10b981" text-anchor="end">${s}</text>
            <line x1="0" y1="6" x2="292" y2="6" stroke="rgba(255,255,255,0.05)"/>
          </g>`,
        )
        .join('')}

      <!-- Action buttons -->
      <g transform="translate(14, 320)">
        <rect width="292" height="36" rx="6" fill="#ffffff"/>
        <text x="146" y="22" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600" fill="#0a0a0c" text-anchor="middle">Save as job</text>
      </g>
      <g transform="translate(14, 366)">
        <rect width="292" height="36" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
        <text x="146" y="22" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="500" fill="#cbd5e1" text-anchor="middle">← Refine picks</text>
      </g>

      <!-- Confidence + meta -->
      <text x="14" y="430" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="600" fill="#737373" letter-spacing="2">PROVIDER</text>
      <text x="14" y="448" font-family="Inter, system-ui, sans-serif" font-size="13" fill="#f5f5f5">Chrome built-in AI</text>
      <text x="14" y="466" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#737373">on-device · free · 1.2s inference</text>

      <text x="14" y="500" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="600" fill="#737373" letter-spacing="2">PAGINATION</text>
      <text x="14" y="518" font-family="Inter, system-ui, sans-serif" font-size="13" fill="#f5f5f5">Next-link detected</text>
      <text x="14" y="536" font-family="ui-monospace, monospace" font-size="11" fill="#a5b4fc">a.morelink</text>
    </g>
  </g>

  <!-- Caption -->
  <text x="${W / 2}" y="780" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">Click examples → AI infers the pattern → every row highlighted in green</text>
</svg>`;

// ── Screenshot 2: Settings (Options) page with Pro license active ─────────

const screenshot2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  ${DEFS}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Settings panel -->
  <g transform="translate(180, 50)" filter="url(#dropshadow)">
    <rect width="920" height="720" rx="16" fill="#0f1115" stroke="rgba(255,255,255,0.08)"/>

    <!-- Header -->
    <text x="40" y="56" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="700" fill="#f5f5f5">Pluck — Settings</text>
    <g transform="translate(800, 36)">
      <rect width="80" height="28" rx="14" fill="url(#cherry)" opacity="0.9"/>
      <text x="40" y="19" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">PRO · lifetime</text>
    </g>

    <!-- Section: AI Provider -->
    <text x="40" y="108" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" fill="#737373" letter-spacing="2">AI PROVIDER</text>

    ${[
      { name: 'Chrome built-in AI (free, on-device)', desc: 'Runs Gemini Nano locally. No API key.', selected: true, ok: true },
      { name: 'Anthropic Claude (BYOK)', desc: 'Highest quality. Your key, your bill.', selected: false, ok: true },
      { name: 'Google Gemini (BYOK)', desc: 'Generous free tier. Second truly-free path.', selected: false, ok: false },
      { name: 'OpenAI (BYOK)', desc: 'GPT-4o mini. ~$0.0001 per inference.', selected: false, ok: false },
    ]
      .map(
        (p, idx) => `
        <g transform="translate(40, ${124 + idx * 84})">
          <rect width="840" height="72" rx="10"
            fill="${p.selected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'}"
            stroke="${p.selected ? '#6366f1' : 'rgba(255,255,255,0.08)'}"
            stroke-width="${p.selected ? 2 : 1}"/>
          <circle cx="24" cy="36" r="8" fill="none" stroke="${p.selected ? '#6366f1' : 'rgba(255,255,255,0.25)'}" stroke-width="2"/>
          ${p.selected ? `<circle cx="24" cy="36" r="4" fill="#6366f1"/>` : ''}
          <text x="48" y="32" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="600" fill="#f5f5f5">${p.name}</text>
          <text x="48" y="52" font-family="Inter, system-ui, sans-serif" font-size="12" fill="#a3a3a3">${p.desc}</text>
          ${
            p.ok
              ? `<text x="820" y="40" font-family="Inter, system-ui, sans-serif" font-size="12" fill="#10b981" text-anchor="end">✓ Available</text>`
              : `<text x="820" y="40" font-family="Inter, system-ui, sans-serif" font-size="12" fill="#737373" text-anchor="end">Configure</text>`
          }
        </g>`,
      )
      .join('')}

    <!-- Section: License -->
    <text x="40" y="478" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" fill="#737373" letter-spacing="2">LICENSE</text>

    <g transform="translate(40, 494)">
      <rect width="840" height="72" rx="10" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.3)" stroke-width="1.5"/>
      <text x="20" y="28" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="600" fill="#10b981">✓ Valid Pro license for ernest2011kostevich@gmail.com</text>
      <text x="20" y="50" font-family="Inter, system-ui, sans-serif" font-size="12" fill="#a3a3a3">Lifetime · all features unlocked · verified offline</text>
    </g>

    <!-- Section: Free tier counter (hidden — would show under FREE) -->
    <text x="40" y="600" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" fill="#737373" letter-spacing="2">JOBS</text>

    <g transform="translate(40, 616)">
      <rect width="840" height="60" rx="10" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)"/>
      <text x="20" y="32" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#cbd5e1">Saved jobs: <tspan font-weight="700" fill="#f5f5f5">12</tspan>  ·  Runs this month: <tspan font-weight="700" fill="#f5f5f5">347</tspan></text>
      <text x="20" y="50" font-family="Inter, system-ui, sans-serif" font-size="12" fill="#737373">Unlimited (Pro) · no row caps · scheduled + manual</text>
    </g>

    <!-- Footer chip -->
    <g transform="translate(40, 698)">
      <text font-family="ui-monospace, monospace" font-size="11" fill="#525252">v0.0.1 · pre-alpha · github.com/ErnestKostevich/Project-3</text>
    </g>
  </g>

  <!-- Caption -->
  <text x="${W / 2}" y="780" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">Four AI providers, free path on-device, Pro features unlocked by an offline-verified license</text>
</svg>`;

// ── Screenshot 3: Popup with saved jobs ───────────────────────────────────

const screenshot3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  ${DEFS}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Faded browser hint behind -->
  <g opacity="0.18" transform="translate(80, 80)">
    <rect width="1120" height="640" rx="12" fill="#1a1d24"/>
    <text x="40" y="60" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#737373">… your active tab in the background …</text>
  </g>

  <!-- Popup (centered, slightly right of center to feel like it's anchored to the extension icon) -->
  <g transform="translate(820, 90)" filter="url(#dropshadow)">
    <rect width="380" height="640" rx="12" fill="#0f1115" stroke="rgba(255,255,255,0.12)"/>

    <!-- Header -->
    ${cherryMark(14, 14, 0.18)}
    <text x="50" y="38" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700" fill="#f5f5f5">Pluck</text>
    <g transform="translate(316, 24)">
      <rect width="50" height="20" rx="10" fill="url(#cherry)"/>
      <text x="25" y="14" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">PRO</text>
    </g>

    <!-- Primary button -->
    <g transform="translate(14, 62)">
      <rect width="352" height="44" rx="8" fill="#6366f1"/>
      <text x="176" y="28" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">Start picker on this tab</text>
    </g>

    <!-- Saved jobs header -->
    <text x="14" y="138" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="700" fill="#737373" letter-spacing="2">SAVED JOBS</text>
    <text x="366" y="138" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#6366f1" text-anchor="end">Settings →</text>

    <!-- Jobs list -->
    ${[
      {
        name: 'HN front page · daily',
        host: 'news.ycombinator.com',
        meta: 'every 24h',
        webhook: true,
        status: '128 rows · 2h ago',
        ok: true,
      },
      {
        name: 'Indie Hackers — milestones',
        host: 'indiehackers.com',
        meta: 'every 6h',
        webhook: false,
        sheets: true,
        status: '47 rows · 5h ago',
        ok: true,
      },
      {
        name: 'Shopify — new arrivals',
        host: 'mystore.example',
        meta: 'every 1h',
        webhook: true,
        status: '312 rows · 14m ago',
        ok: true,
      },
      {
        name: 'Job board scan',
        host: 'careers.example',
        meta: '',
        webhook: false,
        status: 'Manual · last run 2d ago',
        ok: true,
      },
    ]
      .map(
        (job, idx) => `
        <g transform="translate(14, ${156 + idx * 100})">
          <rect width="352" height="88" rx="8" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)"/>
          <text x="14" y="22" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600" fill="#f5f5f5">${job.name}</text>
          <text x="14" y="40" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#a3a3a3">${job.host}</text>
          ${job.meta ? `<g transform="translate(14, 50)"><rect width="84" height="18" rx="4" fill="rgba(255,255,255,0.05)"/><text x="42" y="13" font-family="Inter, system-ui, sans-serif" font-size="10" fill="#cbd5e1" text-anchor="middle">${job.meta}</text></g>` : ''}
          ${job.webhook ? `<g transform="translate(${job.meta ? 106 : 14}, 50)"><rect width="70" height="18" rx="4" fill="rgba(99,102,241,0.12)"/><text x="35" y="13" font-family="Inter, system-ui, sans-serif" font-size="10" fill="#a5b4fc" text-anchor="middle">⚡ webhook</text></g>` : ''}
          ${job.sheets ? `<g transform="translate(${job.meta ? 106 : 14}, 50)"><rect width="60" height="18" rx="4" fill="rgba(16,185,129,0.12)"/><text x="30" y="13" font-family="Inter, system-ui, sans-serif" font-size="10" fill="#34d399" text-anchor="middle">📊 sheets</text></g>` : ''}
          <text x="14" y="80" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#10b981">${job.status}</text>
          <!-- Action icons right -->
          <g transform="translate(296, 30)">
            <rect width="20" height="20" rx="4" fill="rgba(255,255,255,0.06)"/>
            <text x="10" y="14" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#f5f5f5" text-anchor="middle">▶</text>
          </g>
          <g transform="translate(322, 30)">
            <rect width="20" height="20" rx="4" fill="rgba(255,255,255,0.06)"/>
            <text x="10" y="14" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#f5f5f5" text-anchor="middle">⬇</text>
          </g>
        </g>`,
      )
      .join('')}

    <!-- Footer -->
    <line x1="14" y1="586" x2="366" y2="586" stroke="rgba(255,255,255,0.08)"/>
    <text x="14" y="608" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#737373">Active tab:</text>
    <text x="366" y="608" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#cbd5e1" text-anchor="end">news.ycombinator.com</text>
    <text x="14" y="626" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#737373">AI:</text>
    <text x="366" y="626" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#cbd5e1" text-anchor="end">Chrome built-in AI</text>
  </g>

  <!-- Caption -->
  <text x="${W / 2}" y="780" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">Saved jobs run on schedule, deliver to Sheets or your webhook, all from one popup</text>
</svg>`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const targets: Array<[string, string]> = [
    ['screenshot-1-picker.png', screenshot1],
    ['screenshot-2-settings.png', screenshot2],
    ['screenshot-3-popup.png', screenshot3],
  ];
  for (const [name, svg] of targets) {
    const path = resolve(OUT, name);
    await sharp(Buffer.from(svg)).png().toFile(path);
    console.log(`✓ ${path}`);
  }
  console.log('\nDone. Drag each into the CWS Screenshots field.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
