/**
 * Lightweight runtime validators for the API contracts in `./types.ts`.
 *
 * Kept dependency-free (no zod) so the package stays zero-runtime-deps.
 * Swap for zod if/when the validation logic gets non-trivial.
 */

import type { ElementPick, InferRequest, InferResponse, ColumnSpec } from './types.js';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'ValidationError';
  }
}

function assertString(v: unknown, path: string, opts: { maxLen?: number } = {}): string {
  if (typeof v !== 'string') throw new ValidationError('must be string', path);
  if (opts.maxLen != null && v.length > opts.maxLen) {
    throw new ValidationError(`exceeds max length ${opts.maxLen}`, path);
  }
  return v;
}

function assertObject(v: unknown, path: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new ValidationError('must be object', path);
  }
  return v as Record<string, unknown>;
}

function assertArray(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new ValidationError('must be array', path);
  return v;
}

function validateElementPick(v: unknown, path: string): ElementPick {
  const o = assertObject(v, path);
  const pick: ElementPick = {
    domPath: assertString(o.domPath, `${path}.domPath`, { maxLen: 2000 }),
    sampleText: assertString(o.sampleText, `${path}.sampleText`, { maxLen: 500 }),
    sampleHtml: assertString(o.sampleHtml, `${path}.sampleHtml`, { maxLen: 2000 }),
  };
  if (o.label !== undefined) {
    pick.label = assertString(o.label, `${path}.label`, { maxLen: 100 });
  }
  return pick;
}

export function validateInferRequest(v: unknown): InferRequest {
  const o = assertObject(v, 'body');
  const url = assertString(o.url, 'body.url', { maxLen: 2000 });
  const pageHtml = assertString(o.pageHtml, 'body.pageHtml', { maxLen: 200_000 });
  const picksRaw = assertArray(o.picks, 'body.picks');
  if (picksRaw.length === 0) throw new ValidationError('must have ≥1 element', 'body.picks');
  if (picksRaw.length > 20) throw new ValidationError('must have ≤20 elements', 'body.picks');
  const picks = picksRaw.map((p, i) => validateElementPick(p, `body.picks[${i}]`));
  return { url, pageHtml, picks };
}

function validateColumnSpec(v: unknown, path: string): ColumnSpec {
  const o = assertObject(v, path);
  return {
    label: assertString(o.label, `${path}.label`, { maxLen: 100 }),
    selector: assertString(o.selector, `${path}.selector`, { maxLen: 500 }),
    attribute: o.attribute === undefined ? undefined : assertString(o.attribute, `${path}.attribute`),
    transform:
      o.transform === undefined
        ? undefined
        : (assertString(o.transform, `${path}.transform`) as ColumnSpec['transform']),
  };
}

export function validateInferResponse(v: unknown): InferResponse {
  const o = assertObject(v, 'response');
  const containerSelector = assertString(o.containerSelector, 'response.containerSelector');
  const columnsRaw = assertArray(o.columns, 'response.columns');
  const columns = columnsRaw.map((c, i) => validateColumnSpec(c, `response.columns[${i}]`));
  const confidenceRaw = o.confidence;
  if (typeof confidenceRaw !== 'number' || confidenceRaw < 0 || confidenceRaw > 1) {
    throw new ValidationError('must be number in [0,1]', 'response.confidence');
  }
  const sampleRowsRaw = assertArray(o.sampleRows, 'response.sampleRows');
  const sampleRows = sampleRowsRaw.map((r, i) => {
    const row = assertObject(r, `response.sampleRows[${i}]`);
    return Object.fromEntries(
      Object.entries(row).map(([k, val]) => [k, assertString(val, `response.sampleRows[${i}].${k}`)]),
    );
  });
  return {
    containerSelector,
    columns,
    confidence: confidenceRaw,
    sampleRows,
    paginationHint: o.paginationHint as InferResponse['paginationHint'],
  };
}
