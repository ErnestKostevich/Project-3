/**
 * Google Sheets integration via user-deployed Apps Script.
 *
 * Why Apps Script and not direct Sheets API + OAuth: zero OAuth setup. The
 * user deploys a tiny Apps Script that runs as their Google account (it
 * already has Sheets access) and exposes a webhook URL. Pluck POSTs rows
 * to that URL, the Apps Script appends them to the user's sheet.
 *
 * Trade-off: 5-minute setup vs OAuth complexity. Setup guide lives in
 * docs/SHEETS_SETUP.md.
 *
 * No HMAC needed: the Apps Script URL is the shared secret. As long as the
 * user doesn't share the URL, only Pluck can POST to it.
 */

import type { SavedJob, RunRecord, SheetsConfig } from '../storage';

export interface SheetsDispatchResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export async function dispatchSheets(
  config: SheetsConfig,
  job: SavedJob,
  run: RunRecord,
): Promise<SheetsDispatchResult> {
  if (!config.enabled) return { ok: true };
  if (!config.webAppUrl) return { ok: false, error: 'sheets webAppUrl is empty' };
  if (!run.rows || run.rows.length === 0) return { ok: false, error: 'run has no rows to send' };

  // Apps Script web-app endpoints are GET/POST that return text. We POST JSON.
  const body = JSON.stringify({
    jobId: job.id,
    jobName: job.name,
    runId: run.id,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt ?? Date.now(),
    rowCount: run.rowCount,
    columns: job.schema.columns.map((c) => c.label),
    rows: run.rows,
  });

  try {
    // Apps Script web apps redirect through googleusercontent.com — fetch must follow.
    const res = await fetch(config.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'follow',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text || res.statusText };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: `network: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
