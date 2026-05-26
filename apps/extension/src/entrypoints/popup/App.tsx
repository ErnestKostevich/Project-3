import { useEffect, useState, useCallback } from 'react';
import type {
  PopupToContentMessage,
  PopupToBgMessage,
  BgRunJobReply,
} from '@/lib/messages';
import { getSettings, getLicense } from '@/lib/settings';
import type { ProviderId } from '@/lib/ai/types';
import {
  listJobs,
  deleteJob,
  saveJob,
  FREE_TIER_MAX_JOBS,
  type SavedJob,
  type WebhookConfig,
  type SheetsConfig,
} from '@/lib/storage';
import { verifyLicense } from '@/lib/license';
import { downloadCsv, rowsToCsv, slugify } from '@/lib/export';
import { getRun } from '@/lib/storage';
import { scheduleJob, unscheduleJob } from '@/lib/scheduling';
import { generateWebhookSecret } from '@/lib/integrations/webhook';

const PROVIDER_LABELS: Record<ProviderId, string> = {
  'chrome-builtin': 'Chrome built-in AI',
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
};

const SCHEDULE_OPTIONS: Array<{ label: string; minutes: number | null }> = [
  { label: 'Off', minutes: null },
  { label: 'Every 5m', minutes: 5 },
  { label: 'Every 15m', minutes: 15 },
  { label: 'Every 1h', minutes: 60 },
  { label: 'Every 6h', minutes: 360 },
  { label: 'Every 24h', minutes: 1440 },
];

export function App() {
  const [tabUrl, setTabUrl] = useState<string>('');
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [s, lic, js] = await Promise.all([getSettings(), getLicense(), listJobs()]);
    setProvider(s.provider);
    setJobs(js);
    if (lic) {
      const res = await verifyLicense(lic);
      setIsPro(res.valid && res.payload.plan === 'pro');
    } else {
      setIsPro(false);
    }
  }, []);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setTabUrl(tabs[0]?.url ?? '');
    });
    refresh();
  }, [refresh]);

  async function startPicker() {
    setError(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setError('No active tab.');
      return;
    }
    if (tab.url && /^(chrome|edge|about|file):/.test(tab.url)) {
      setError('Pluck cannot run on browser internal pages. Open a regular web page.');
      return;
    }
    const message: PopupToContentMessage = { type: 'start-picker' };
    try {
      await chrome.tabs.sendMessage(tab.id, message);
      window.close();
    } catch (err) {
      setError(
        `Could not start picker. Reload the target page and try again. (${
          err instanceof Error ? err.message : String(err)
        })`,
      );
    }
  }

  async function runJob(jobId: string) {
    setRunningJobs((s) => new Set(s).add(jobId));
    const msg: PopupToBgMessage = { type: 'run-job', jobId };
    try {
      const reply: BgRunJobReply = await chrome.runtime.sendMessage(msg);
      if (!reply.ok) setError(`Run failed: ${reply.error}`);
    } catch (err) {
      setError(`Run failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningJobs((s) => {
        const next = new Set(s);
        next.delete(jobId);
        return next;
      });
      refresh();
    }
  }

  async function exportJob(job: SavedJob) {
    if (!job.lastRun) {
      setError('This job has no completed run yet. Run it first.');
      return;
    }
    const run = await getRun(job.lastRun.runId);
    if (!run?.rows || run.rows.length === 0) {
      setError('No rows in the most recent run.');
      return;
    }
    const csv = rowsToCsv(run.rows);
    downloadCsv(
      `${slugify(job.name)}-${new Date(run.startedAt).toISOString().slice(0, 10)}.csv`,
      csv,
    );
  }

  async function deleteJobById(jobId: string) {
    if (!confirm('Delete this job and its run history? This cannot be undone.')) return;
    await unscheduleJob(jobId).catch(() => {});
    await deleteJob(jobId);
    refresh();
  }

  function openOptions(e: React.MouseEvent) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  }

  const atFreeTierCap = !isPro && jobs.length >= FREE_TIER_MAX_JOBS;

  return (
    <main>
      <header>
        <span className="brand">🍒 Pluck</span>
        <span className={`badge ${isPro ? 'pro' : ''}`}>{isPro ? 'PRO' : 'FREE'}</span>
      </header>

      <section className="hero">
        <button
          className="primary"
          onClick={startPicker}
          disabled={atFreeTierCap}
          title={atFreeTierCap ? 'Free tier limit reached. Upgrade or delete a job first.' : undefined}
        >
          {atFreeTierCap ? 'Free tier limit reached' : 'Start picker on this tab'}
        </button>
        {!isPro && (
          <p className="hero-hint">
            {jobs.length}/{FREE_TIER_MAX_JOBS} jobs used ·{' '}
            <a href="#" onClick={openOptions}>
              Upgrade
            </a>
          </p>
        )}
      </section>

      {error && (
        <div className="error" onClick={() => setError(null)}>
          {error}
          <span className="dismiss">✕</span>
        </div>
      )}

      <section className="jobs">
        <div className="jobs-header">
          <h2>Saved jobs</h2>
          <a href="#" onClick={openOptions} className="settings-link">
            Settings
          </a>
        </div>
        {jobs.length === 0 ? (
          <p className="empty">
            No jobs yet. Click <strong>Start picker</strong> on any page to create one.
          </p>
        ) : (
          <ul className="job-list">
            {jobs.map((job) => (
              <li key={job.id}>
                <div className="job-row">
                  <div className="job-meta">
                    <div className="job-name" title={job.name}>
                      {job.name}
                    </div>
                    <div className="job-host">
                      {hostnameOrUrl(job.url)}
                      {job.schedule && (
                        <span className="schedule-tag">
                          every {humanPeriod(job.schedule.periodMinutes)}
                        </span>
                      )}
                      {job.integrations?.webhook?.enabled && (
                        <span className="schedule-tag" title="Webhook configured">
                          ⚡ webhook
                        </span>
                      )}
                      {job.integrations?.sheets?.enabled && (
                        <span className="schedule-tag" title="Sheets export configured">
                          📊 sheets
                        </span>
                      )}
                    </div>
                    {job.lastRun ? (
                      <div className={`last-run ${job.lastRun.status}`}>
                        {job.lastRun.status === 'succeeded' && `${job.lastRun.rowCount} rows`}
                        {job.lastRun.status === 'failed' && `Failed`}
                        {job.lastRun.status === 'running' && `Running…`}
                        {' · '}
                        {timeAgo(job.lastRun.finishedAt)}
                      </div>
                    ) : (
                      <div className="last-run none">Never run</div>
                    )}
                  </div>
                  <div className="job-actions">
                    <button
                      onClick={() => runJob(job.id)}
                      disabled={runningJobs.has(job.id)}
                      title="Run now"
                    >
                      {runningJobs.has(job.id) ? '…' : '▶'}
                    </button>
                    <button
                      onClick={() => exportJob(job)}
                      disabled={!job.lastRun || job.lastRun.rowCount === 0}
                      title="Download CSV of latest run"
                    >
                      ⬇
                    </button>
                    <button
                      onClick={() => setEditingJobId(editingJobId === job.id ? null : job.id)}
                      title="Edit job"
                    >
                      ✎
                    </button>
                    <button onClick={() => deleteJobById(job.id)} title="Delete">
                      ✕
                    </button>
                  </div>
                </div>
                {editingJobId === job.id && (
                  <JobEditForm
                    job={job}
                    isPro={isPro}
                    onClose={() => setEditingJobId(null)}
                    onSaved={async () => {
                      setEditingJobId(null);
                      await refresh();
                    }}
                    onError={(msg) => setError(msg)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        <div className="row">
          <span>Active tab:</span>
          <span className="tab-url" title={tabUrl}>
            {tabUrl ? new URL(tabUrl).hostname : '—'}
          </span>
        </div>
        <div className="row">
          <span>AI:</span>
          <span className="tab-url">{provider ? PROVIDER_LABELS[provider] : '…'}</span>
        </div>
      </footer>
    </main>
  );
}

function JobEditForm({
  job,
  isPro,
  onClose,
  onSaved,
  onError,
}: {
  job: SavedJob;
  isPro: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(job.name);
  const [scheduleMinutes, setScheduleMinutes] = useState<number | null>(
    job.schedule?.periodMinutes ?? null,
  );
  const [webhook, setWebhook] = useState<WebhookConfig>(
    job.integrations?.webhook ?? { enabled: false, url: '', secret: '' },
  );
  const [sheets, setSheets] = useState<SheetsConfig>(
    job.integrations?.sheets ?? { enabled: false, webAppUrl: '' },
  );
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  function ensureSecret() {
    if (!webhook.secret) {
      setWebhook({ ...webhook, secret: generateWebhookSecret() });
    }
  }

  async function save() {
    setSaving(true);
    try {
      const integrationsActive = webhook.enabled || webhook.url || sheets.enabled || sheets.webAppUrl;
      const updated: SavedJob = {
        ...job,
        name: name.trim() || job.name,
        schedule:
          scheduleMinutes != null
            ? {
                periodMinutes: scheduleMinutes,
                nextRunAt: Date.now() + scheduleMinutes * 60_000,
              }
            : undefined,
        integrations: integrationsActive
          ? {
              ...(webhook.enabled || webhook.url ? { webhook } : {}),
              ...(sheets.enabled || sheets.webAppUrl ? { sheets } : {}),
            }
          : undefined,
      };

      await saveJob(updated);

      // Sync the alarm.
      if (scheduleMinutes != null) {
        await scheduleJob(job.id, scheduleMinutes);
      } else {
        await unscheduleJob(job.id);
      }

      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="edit-form">
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="field">
        <span>
          Schedule
          {!isPro && <span className="pro-tag"> · Pro</span>}
        </span>
        <select
          value={scheduleMinutes ?? ''}
          onChange={(e) => setScheduleMinutes(e.target.value === '' ? null : Number(e.target.value))}
          disabled={!isPro}
        >
          {SCHEDULE_OPTIONS.map((o) => (
            <option key={o.label} value={o.minutes ?? ''}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="field">
        <legend>
          Webhook{!isPro && <span className="pro-tag"> · Pro</span>}
        </legend>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={webhook.enabled}
            disabled={!isPro}
            onChange={(e) => {
              const enabled = e.target.checked;
              ensureSecret();
              setWebhook((w) => ({
                ...w,
                enabled,
                secret: w.secret || generateWebhookSecret(),
              }));
            }}
          />
          <span>Send rows to URL after each run</span>
        </label>
        {webhook.enabled && (
          <>
            <input
              type="url"
              placeholder="https://your-server.com/webhook"
              value={webhook.url}
              onChange={(e) => setWebhook((w) => ({ ...w, url: e.target.value }))}
              disabled={!isPro}
            />
            <div className="secret-row">
              <span className="muted">HMAC secret:</span>
              <code className="secret">
                {showSecret ? webhook.secret : '•'.repeat(Math.min(webhook.secret.length, 24))}
              </code>
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="ghost-btn"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(webhook.secret)}
                className="ghost-btn"
                disabled={!webhook.secret}
              >
                Copy
              </button>
            </div>
            <p className="hint">
              Your server should HMAC-SHA256 the request body using this secret and compare to the
              <code> x-pluck-signature</code> header.
            </p>
          </>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>
          Google Sheets{!isPro && <span className="pro-tag"> · Pro</span>}
        </legend>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={sheets.enabled}
            disabled={!isPro}
            onChange={(e) => setSheets((s) => ({ ...s, enabled: e.target.checked }))}
          />
          <span>Append rows to a Google Sheet after each run</span>
        </label>
        {sheets.enabled && (
          <>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={sheets.webAppUrl}
              onChange={(e) => setSheets((s) => ({ ...s, webAppUrl: e.target.value }))}
              disabled={!isPro}
            />
            <p className="hint">
              Deploy a tiny Apps Script first to give Pluck a URL to POST to. See{' '}
              <a
                href="https://github.com/ErnestKostevich/Project-3/blob/main/docs/SHEETS_SETUP.md"
                target="_blank"
                rel="noreferrer"
              >
                the 5-min setup guide
              </a>
              .
            </p>
          </>
        )}
      </fieldset>

      <div className="edit-actions">
        <button onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function hostnameOrUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function humanPeriod(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}
