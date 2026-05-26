/**
 * Job + run persistence in `chrome.storage.local`.
 *
 * Storage budget: chrome.storage.local has a 10 MB quota by default. We cap:
 *   - Jobs: unlimited count, but each schema is < 5 KB
 *   - Run records: last 20 per job, last 1000 globally — older ones get pruned
 *   - Row data: only the most recent successful run keeps its rows in storage;
 *     older runs keep counts + metadata only (the user can re-run to re-extract)
 *
 * Keys are namespaced under `pluck:` to keep us out of other extensions' way.
 */

import type { InferResponse } from '@pluck/shared';

export interface SavedJob {
  id: string;
  name: string;
  url: string;
  schema: InferResponse;
  /** If set, the job runs on this schedule via chrome.alarms. */
  schedule?: {
    /** Minimum 1 minute due to chrome.alarms constraint on packed extensions. */
    periodMinutes: number;
    nextRunAt: number;
  };
  /** Safety caps for paginated scrapes. */
  paginationCap?: {
    maxPages?: number;
    maxRows?: number;
  };
  /** Outbound integrations fired after a successful run. */
  integrations?: {
    webhook?: WebhookConfig;
    sheets?: SheetsConfig;
  };
  /** Last run summary — denormalized for fast popup rendering. */
  lastRun?: {
    runId: string;
    status: RunRecord['status'];
    finishedAt: number;
    rowCount: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Per-job webhook configuration. Pro feature.
 * Secret is generated once per job (random 32-byte base64) and used for HMAC-SHA256
 * signing of the outbound POST body.
 */
export interface WebhookConfig {
  enabled: boolean;
  url: string;
  /** Auto-generated secret. The user sees it in the edit form so they can configure their server. */
  secret: string;
}

/**
 * Google Sheets integration config. Points at the user's deployed Apps Script
 * web-app URL (which has access to write to their sheet, running as them).
 * No secret is stored; the URL token itself is the access credential.
 */
export interface SheetsConfig {
  enabled: boolean;
  webAppUrl: string;
}

export interface RunRecord {
  id: string;
  jobId: string;
  startedAt: number;
  finishedAt?: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  rowCount: number;
  /** Extracted rows. Only kept for the most recent successful run per job. */
  rows?: Record<string, string>[];
  error?: string;
}

const JOBS_KEY = 'pluck:jobs:v1';
const RUNS_KEY = 'pluck:runs:v1';
const MAX_RUNS_PER_JOB = 20;
const MAX_TOTAL_RUNS = 1000;

// ── Job CRUD ────────────────────────────────────────────────────────────────

export async function listJobs(): Promise<SavedJob[]> {
  const raw = await chromeStorageGet<Record<string, SavedJob>>(JOBS_KEY);
  if (!raw) return [];
  return Object.values(raw).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getJob(id: string): Promise<SavedJob | null> {
  const raw = await chromeStorageGet<Record<string, SavedJob>>(JOBS_KEY);
  return raw?.[id] ?? null;
}

export async function saveJob(
  job: Omit<SavedJob, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<SavedJob> {
  const raw = (await chromeStorageGet<Record<string, SavedJob>>(JOBS_KEY)) ?? {};
  const id = job.id ?? crypto.randomUUID();
  const now = Date.now();
  const existing = raw[id];
  const next: SavedJob = {
    ...job,
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  raw[id] = next;
  await chromeStorageSet(JOBS_KEY, raw);
  return next;
}

export async function deleteJob(id: string): Promise<void> {
  const raw = (await chromeStorageGet<Record<string, SavedJob>>(JOBS_KEY)) ?? {};
  delete raw[id];
  await chromeStorageSet(JOBS_KEY, raw);
  // Also prune that job's runs.
  const runs = (await chromeStorageGet<RunRecord[]>(RUNS_KEY)) ?? [];
  await chromeStorageSet(
    RUNS_KEY,
    runs.filter((r) => r.jobId !== id),
  );
}

// ── Run records ─────────────────────────────────────────────────────────────

export async function listRuns(jobId?: string): Promise<RunRecord[]> {
  const all = (await chromeStorageGet<RunRecord[]>(RUNS_KEY)) ?? [];
  const filtered = jobId ? all.filter((r) => r.jobId === jobId) : all;
  return filtered.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getRun(id: string): Promise<RunRecord | null> {
  const all = (await chromeStorageGet<RunRecord[]>(RUNS_KEY)) ?? [];
  return all.find((r) => r.id === id) ?? null;
}

export async function appendRun(run: RunRecord): Promise<void> {
  const all = (await chromeStorageGet<RunRecord[]>(RUNS_KEY)) ?? [];
  all.push(run);

  // Prune: per-job and global caps. Keep most recent.
  const perJob = new Map<string, RunRecord[]>();
  for (const r of all) {
    if (!perJob.has(r.jobId)) perJob.set(r.jobId, []);
    perJob.get(r.jobId)!.push(r);
  }
  const pruned: RunRecord[] = [];
  for (const [, runs] of perJob) {
    runs.sort((a, b) => b.startedAt - a.startedAt);
    pruned.push(...runs.slice(0, MAX_RUNS_PER_JOB));
  }
  pruned.sort((a, b) => b.startedAt - a.startedAt);
  const capped = pruned.slice(0, MAX_TOTAL_RUNS);

  // Drop row data from old runs to save quota (keep most recent succeeded run per job with rows).
  const seenJobsWithRows = new Set<string>();
  for (const r of capped) {
    if (r.status === 'succeeded' && r.rows && !seenJobsWithRows.has(r.jobId)) {
      seenJobsWithRows.add(r.jobId);
    } else {
      delete r.rows;
    }
  }

  await chromeStorageSet(RUNS_KEY, capped);

  // Update denormalized lastRun on the job.
  const jobs = (await chromeStorageGet<Record<string, SavedJob>>(JOBS_KEY)) ?? {};
  const job = jobs[run.jobId];
  if (job) {
    job.lastRun = {
      runId: run.id,
      status: run.status,
      finishedAt: run.finishedAt ?? run.startedAt,
      rowCount: run.rowCount,
    };
    job.updatedAt = Date.now();
    await chromeStorageSet(JOBS_KEY, jobs);
  }
}

export async function updateRun(id: string, patch: Partial<RunRecord>): Promise<void> {
  const all = (await chromeStorageGet<RunRecord[]>(RUNS_KEY)) ?? [];
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  all[i] = { ...all[i]!, ...patch };
  await chromeStorageSet(RUNS_KEY, all);
}

// ── Free-tier limits ────────────────────────────────────────────────────────

export const FREE_TIER_MAX_JOBS = 3;

export async function getJobCount(): Promise<number> {
  return (await listJobs()).length;
}

// ── chrome.storage promise wrappers ─────────────────────────────────────────

function chromeStorageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (items) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(items[key] as T | undefined);
    });
  });
}

function chromeStorageSet<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}
