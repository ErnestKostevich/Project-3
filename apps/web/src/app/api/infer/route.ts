import { NextResponse } from 'next/server';
import { validateInferRequest, type InferResponse } from '@pluck/shared';

export const runtime = 'nodejs';

/**
 * POST /api/infer
 *
 * Accepts the user's picks + page HTML, returns a proposed schema.
 *
 * This is the **mock** implementation — it does not actually call an LLM yet.
 * Phase 1 of the roadmap replaces this with a real Anthropic call.
 *
 * The mock still validates inputs and shapes its output identically to the
 * real implementation so the extension code is final from day one.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  let input;
  try {
    input = validateInferRequest(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Mock inference: pretend we figured out a pattern from the first pick.
  // We turn each user pick into a column with a placeholder selector.
  const columns = input.picks.map((p, i) => ({
    label: p.label?.trim() || `column_${i + 1}`,
    selector: deriveRelativeSelector(p.domPath),
    attribute: guessAttribute(p.sampleHtml),
  }));

  // Fake sample rows derived from the user's actual picks (so the UI feels real).
  const sampleRows = Array.from({ length: 3 }, (_, rowIdx) =>
    Object.fromEntries(
      columns.map((c, colIdx) => [
        c.label,
        rowIdx === 0
          ? (input.picks[colIdx]?.sampleText ?? '').slice(0, 80)
          : `(mocked row ${rowIdx + 1}) ${c.label}`,
      ]),
    ),
  );

  const response: InferResponse = {
    containerSelector: deriveContainerSelector(input.picks[0]?.domPath ?? ''),
    columns,
    paginationHint: { type: 'none' },
    confidence: 0.42, // honest about being a mock
    sampleRows,
  };

  return NextResponse.json(response satisfies InferResponse);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// ── Helpers (extracted so they're easy to replace with the real AI call) ────

function deriveContainerSelector(domPath: string): string {
  // Heuristic for the mock: take the second-to-last segment as the "row".
  const parts = domPath.split(' > ').filter(Boolean);
  if (parts.length < 2) return parts[0] ?? 'body';
  return parts.slice(0, -1).join(' > ');
}

function deriveRelativeSelector(domPath: string): string {
  const parts = domPath.split(' > ').filter(Boolean);
  return parts.at(-1) ?? '*';
}

function guessAttribute(html: string): 'text' | 'href' | 'src' {
  if (/<a\b/i.test(html)) return 'href';
  if (/<img\b/i.test(html)) return 'src';
  return 'text';
}
