/**
 * Execute a saved job:
 *   1. Open the URL in a hidden tab.
 *   2. Extract rows. Strategy depends on schema.paginationHint.type:
 *        - 'next-link' or 'page-numbers' → navigate-and-extract loop
 *        - 'infinite-scroll'             → scroll-and-extract loop (dedupe)
 *        - 'none' or undefined           → extract once
 *   3. If the page is CAPTCHA-protected, bail with a clear error.
 *   4. Persist a RunRecord.
 *   5. If integrations (webhook, sheets) are enabled, dispatch to each.
 *   6. Close the tab.
 *
 * Called by:
 *   - Popup's "Run now" button (via 'run-job' message to background)
 *   - chrome.alarms.onAlarm listener for scheduled runs
 */

import type { SavedJob, RunRecord } from './storage';
import { appendRun, getJob, updateRun } from './storage';
import { dispatchWebhook } from './integrations/webhook';
import { dispatchSheets } from './integrations/sheets';

const PAGE_LOAD_TIMEOUT_MS = 30_000;
const POST_LOAD_DWELL_MS = 1500;
const SCROLL_DWELL_MS = 1200;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_MAX_ROWS = 1000;
const HARD_MAX_PAGES = 50;
const HARD_MAX_ROWS = 10_000;
const INFINITE_STOP_AFTER_STABLE_ROUNDS = 3;

export async function runJob(jobId: string): Promise<RunRecord> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found.`);

  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const initial: RunRecord = {
    id: runId,
    jobId: job.id,
    startedAt,
    status: 'running',
    rowCount: 0,
  };
  await appendRun(initial);

  const maxPages = Math.min(job.paginationCap?.maxPages ?? DEFAULT_MAX_PAGES, HARD_MAX_PAGES);
  const maxRows = Math.min(job.paginationCap?.maxRows ?? DEFAULT_MAX_ROWS, HARD_MAX_ROWS);
  const paginationType = job.schema.paginationHint?.type;
  const isInfiniteScroll = paginationType === 'infinite-scroll';
  const isClickPagination =
    paginationType === 'next-link' || paginationType === 'page-numbers';

  let tabId: number | undefined;
  let allRows: Record<string, string>[] = [];

  try {
    const tab = await chrome.tabs.create({ url: job.url, active: false });
    tabId = tab.id;
    if (!tabId) throw new Error('Failed to create background tab.');

    await waitForTabComplete(tabId, PAGE_LOAD_TIMEOUT_MS);
    await sleep(POST_LOAD_DWELL_MS);

    // First extract — also gives us the captcha-detection signal.
    const first = await runExtractor(tabId, job);
    if (first.captchaDetected) {
      throw new Error(
        `Page is protected by a CAPTCHA (${first.captchaDetected}). ` +
          `Pluck cannot bypass CAPTCHAs in the browser — try a page you can already browse normally, ` +
          `or wait for the Business tier (cloud worker + proxy rotation).`,
      );
    }
    allRows.push(...first.rows);

    if (isInfiniteScroll) {
      allRows = await scrollExtractLoop(tabId, job, allRows, maxPages, maxRows);
    } else if (isClickPagination) {
      allRows = await navigateExtractLoop(tabId, job, first, allRows, maxPages, maxRows);
    }

    const trimmedRows = allRows.slice(0, maxRows);
    const finishedAt = Date.now();
    const final: RunRecord = {
      ...initial,
      status: 'succeeded',
      finishedAt,
      rowCount: trimmedRows.length,
      rows: trimmedRows,
    };
    await updateRun(runId, final);

    // Fire-and-forget integrations (after persistence so the run is recorded
    // even if these fail).
    dispatchIntegrations(job, final).catch((err) => {
      console.error('[pluck] integration dispatch failed', err);
    });

    return final;
  } catch (err) {
    const finishedAt = Date.now();
    const failed: RunRecord = {
      ...initial,
      status: 'failed',
      finishedAt,
      rowCount: allRows.length,
      rows: allRows.length > 0 ? allRows : undefined,
      error: err instanceof Error ? err.message : String(err),
    };
    await updateRun(runId, failed);
    return failed;
  } finally {
    if (tabId) {
      try {
        await chrome.tabs.remove(tabId);
      } catch {
        /* tab already gone */
      }
    }
  }
}

async function dispatchIntegrations(job: SavedJob, run: RunRecord) {
  const tasks: Promise<unknown>[] = [];
  const webhook = job.integrations?.webhook;
  if (webhook?.enabled && webhook.url) tasks.push(dispatchWebhook(webhook, job, run));
  const sheets = job.integrations?.sheets;
  if (sheets?.enabled && sheets.webAppUrl) tasks.push(dispatchSheets(sheets, job, run));
  await Promise.all(tasks);
}

async function navigateExtractLoop(
  tabId: number,
  job: SavedJob,
  firstResult: ExtractResult,
  rowsSoFar: Record<string, string>[],
  maxPages: number,
  maxRows: number,
): Promise<Record<string, string>[]> {
  let nextUrl = firstResult.nextUrl;
  let pagesScraped = 1;
  const allRows = [...rowsSoFar];
  let currentUrl = job.url;

  while (nextUrl && nextUrl !== currentUrl && pagesScraped < maxPages && allRows.length < maxRows) {
    await chrome.tabs.update(tabId, { url: nextUrl });
    await waitForTabComplete(tabId, PAGE_LOAD_TIMEOUT_MS);
    await sleep(POST_LOAD_DWELL_MS);
    currentUrl = nextUrl;

    const result = await runExtractor(tabId, job);
    if (result.captchaDetected) {
      // Stop pagination silently — return what we have so far. The first page
      // already passed the captcha check, so this is unusual but possible.
      break;
    }
    allRows.push(...result.rows);
    pagesScraped++;
    nextUrl = result.nextUrl && result.nextUrl !== currentUrl ? result.nextUrl : null;
  }

  return allRows;
}

async function scrollExtractLoop(
  tabId: number,
  job: SavedJob,
  rowsSoFar: Record<string, string>[],
  maxScrolls: number,
  maxRows: number,
): Promise<Record<string, string>[]> {
  const dedupe = new Map<string, Record<string, string>>();
  for (const row of rowsSoFar) {
    const key = JSON.stringify(row);
    if (!dedupe.has(key)) dedupe.set(key, row);
  }
  let stableRounds = 0;

  for (let i = 0; i < maxScrolls; i++) {
    if (dedupe.size >= maxRows) break;
    if (stableRounds >= INFINITE_STOP_AFTER_STABLE_ROUNDS) break;

    // Scroll to bottom.
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.scrollTo(0, document.body.scrollHeight),
    });
    await sleep(SCROLL_DWELL_MS);

    const before = dedupe.size;
    const result = await runExtractor(tabId, job);
    for (const row of result.rows) {
      const key = JSON.stringify(row);
      if (!dedupe.has(key)) dedupe.set(key, row);
    }
    if (dedupe.size === before) stableRounds++;
    else stableRounds = 0;
  }

  return Array.from(dedupe.values());
}

interface ExtractResult {
  containerMatches: number;
  rows: Record<string, string>[];
  nextUrl: string | null;
  captchaDetected: string | null;
}

async function runExtractor(tabId: number, job: SavedJob): Promise<ExtractResult> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: extractInPage,
    args: [job.schema],
  });
  const out = results[0]?.result as ExtractResult | undefined;
  if (!out) throw new Error('Extractor returned no result.');
  return out;
}

function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Page load timed out.'));
    }, timeoutMs);

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
    ): void => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId).then((t) => {
      if (t.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs IN THE PAGE CONTEXT (chrome.scripting copies this function's source
 * into the page). MUST be self-contained — no closures over enclosing-scope
 * variables, no imports.
 */
function extractInPage(schema: SavedJob['schema']): {
  containerMatches: number;
  rows: Record<string, string>[];
  nextUrl: string | null;
  captchaDetected: string | null;
} {
  // ── 1. CAPTCHA detection ────────────────────────────────────────────────
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[src*="challenges.cloudflare.com"]',
    'iframe[src*="turnstile"]',
    '.g-recaptcha',
    '#cf-turnstile',
    '.cf-turnstile',
    '.cf-challenge-running',
    'div[data-sitekey]',
    'div[data-hcaptcha-sitekey]',
  ];
  let captchaDetected: string | null = null;
  for (const sel of captchaSelectors) {
    try {
      if (document.querySelector(sel)) {
        captchaDetected = sel;
        break;
      }
    } catch {
      /* ignore invalid selector edge cases */
    }
  }

  // ── 2. Row extraction ───────────────────────────────────────────────────
  const containers = Array.from(document.querySelectorAll(schema.containerSelector));
  const rows: Record<string, string>[] = [];

  for (const container of containers) {
    const row: Record<string, string> = {};
    for (const col of schema.columns) {
      let el: Element | null;
      try {
        el =
          col.selector === '' || col.selector === '.'
            ? container
            : container.querySelector(col.selector);
      } catch {
        el = null;
      }
      if (!el) {
        row[col.label] = '';
        continue;
      }
      let raw = '';
      switch (col.attribute) {
        case undefined:
        case 'text':
          raw = (el as HTMLElement).innerText ?? el.textContent ?? '';
          break;
        case 'href':
          raw = el.getAttribute('href') ?? '';
          if (raw) {
            try {
              raw = new URL(raw, document.baseURI).href;
            } catch {
              /* leave as-is */
            }
          }
          break;
        case 'src':
          raw = el.getAttribute('src') ?? '';
          if (raw) {
            try {
              raw = new URL(raw, document.baseURI).href;
            } catch {
              /* leave as-is */
            }
          }
          break;
        case 'value':
          raw = (el as HTMLInputElement).value ?? '';
          break;
        default:
          raw = el.getAttribute(col.attribute) ?? '';
      }
      row[col.label] = raw.replace(/\s+/g, ' ').trim();
    }
    rows.push(row);
  }

  // ── 3. Next-page URL (for next-link / page-numbers) ─────────────────────
  let nextUrl: string | null = null;
  const hint = schema.paginationHint;
  if (
    hint &&
    (hint.type === 'next-link' || hint.type === 'page-numbers') &&
    hint.selector
  ) {
    try {
      const nextEl = document.querySelector(hint.selector);
      if (nextEl) {
        const href = nextEl.getAttribute('href');
        if (href) {
          try {
            nextUrl = new URL(href, document.baseURI).href;
          } catch {
            nextUrl = null;
          }
        }
      }
    } catch {
      nextUrl = null;
    }
  }

  return { containerMatches: containers.length, rows, nextUrl, captchaDetected };
}
