/**
 * Shared types for Pluck API contracts.
 * Consumed by both the Chrome extension and the Next.js web app.
 */

// ── User picks (sent from extension) ────────────────────────────────────────

/** A single element the user clicked while building a scrape. */
export interface ElementPick {
  /** CSS-style path to the element, e.g. "div.list > article:nth-child(3) > h2 > a". */
  domPath: string;
  /** The element's visible text (trimmed, truncated to 500 chars). */
  sampleText: string;
  /** The element's outerHTML (trimmed, truncated to 2000 chars). */
  sampleHtml: string;
  /** Optional user-provided column label (e.g. "Title", "Price"). */
  label?: string;
}

// ── Inference request / response ────────────────────────────────────────────

export interface InferRequest {
  url: string;
  /** Sanitized page HTML (scripts/comments stripped, max ~50k chars). */
  pageHtml: string;
  picks: ElementPick[];
}

export interface InferResponse {
  /** CSS selector for the repeating container that holds each row. */
  containerSelector: string;
  columns: ColumnSpec[];
  paginationHint?: PaginationHint;
  /** AI confidence in the proposal, 0–1. */
  confidence: number;
  /** 3–5 example rows extracted using the proposed selectors. */
  sampleRows: Array<Record<string, string>>;
}

export interface ColumnSpec {
  label: string;
  /** CSS selector relative to the container element. */
  selector: string;
  /** Which attribute to extract; "text" means innerText. */
  attribute?: 'text' | 'href' | 'src' | 'value' | (string & {});
  transform?: 'trim' | 'number' | 'url' | 'date';
}

export interface PaginationHint {
  type: 'next-link' | 'infinite-scroll' | 'page-numbers' | 'none';
  selector?: string;
}

// ── Persisted entities (used by web app) ────────────────────────────────────

export interface JobSpec {
  id: string;
  userId: string;
  name: string;
  url: string;
  schema: {
    containerSelector: string;
    columns: ColumnSpec[];
    pagination?: PaginationHint;
  };
  scheduleCron?: string;
  paused: boolean;
  createdAt: string;
}

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface RunSummary {
  id: string;
  jobId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  rowCount: number;
  error?: string;
}

// ── Plans ───────────────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'starter' | 'pro' | 'business';

export interface PlanLimits {
  rowsPerMonth: number;
  scheduledRuns: boolean;
  integrations: ('sheets' | 'webhook' | 'airtable')[];
  teamSeats: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    rowsPerMonth: 100,
    scheduledRuns: false,
    integrations: [],
    teamSeats: 1,
  },
  starter: {
    rowsPerMonth: 10_000,
    scheduledRuns: true,
    integrations: ['sheets'],
    teamSeats: 1,
  },
  pro: {
    rowsPerMonth: 100_000,
    scheduledRuns: true,
    integrations: ['sheets', 'webhook', 'airtable'],
    teamSeats: 3,
  },
  business: {
    rowsPerMonth: 1_000_000,
    scheduledRuns: true,
    integrations: ['sheets', 'webhook', 'airtable'],
    teamSeats: 10,
  },
};
