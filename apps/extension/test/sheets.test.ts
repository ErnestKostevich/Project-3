import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dispatchSheets } from '@/lib/integrations/sheets';
import type { SavedJob, RunRecord, SheetsConfig } from '@/lib/storage';

const SAMPLE_JOB: SavedJob = {
  id: 'job-1',
  name: 'Test Job',
  url: 'https://example.com',
  schema: {
    containerSelector: '.row',
    columns: [
      { label: 'title', selector: 'h2' },
      { label: 'price', selector: '.price' },
    ],
    confidence: 1,
    sampleRows: [],
  },
  createdAt: 0,
  updatedAt: 0,
};

const SAMPLE_RUN: RunRecord = {
  id: 'run-1',
  jobId: 'job-1',
  startedAt: 100,
  finishedAt: 200,
  status: 'succeeded',
  rowCount: 2,
  rows: [
    { title: 'A', price: '$1' },
    { title: 'B', price: '$2' },
  ],
};

describe('dispatchSheets', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no-ops when disabled', async () => {
    const config: SheetsConfig = { enabled: false, webAppUrl: 'https://x' };
    const res = await dispatchSheets(config, SAMPLE_JOB, SAMPLE_RUN);
    expect(res.ok).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('errors when webAppUrl is empty', async () => {
    const config: SheetsConfig = { enabled: true, webAppUrl: '' };
    const res = await dispatchSheets(config, SAMPLE_JOB, SAMPLE_RUN);
    expect(res.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('errors when run has no rows', async () => {
    const config: SheetsConfig = { enabled: true, webAppUrl: 'https://x' };
    const emptyRun: RunRecord = { ...SAMPLE_RUN, rows: undefined };
    const res = await dispatchSheets(config, SAMPLE_JOB, emptyRun);
    expect(res.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('POSTs the right body shape with columns + rows', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, appended: 2 }), { status: 200 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const config: SheetsConfig = {
      enabled: true,
      webAppUrl: 'https://script.google.com/macros/s/test/exec',
    };
    const res = await dispatchSheets(config, SAMPLE_JOB, SAMPLE_RUN);
    expect(res.ok).toBe(true);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://script.google.com/macros/s/test/exec');
    expect(opts.method).toBe('POST');
    expect(opts.redirect).toBe('follow');

    const body = JSON.parse(opts.body);
    expect(body.columns).toEqual(['title', 'price']);
    expect(body.rows).toHaveLength(2);
    expect(body.rows[0]).toEqual({ title: 'A', price: '$1' });
    expect(body.jobName).toBe('Test Job');
    expect(body.runId).toBe('run-1');
  });

  it('reports HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 })),
    );
    const config: SheetsConfig = { enabled: true, webAppUrl: 'https://x' };
    const res = await dispatchSheets(config, SAMPLE_JOB, SAMPLE_RUN);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain('Forbidden');
  });

  it('reports network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('dns failure')));
    const config: SheetsConfig = { enabled: true, webAppUrl: 'https://x' };
    const res = await dispatchSheets(config, SAMPLE_JOB, SAMPLE_RUN);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('dns failure');
  });
});
