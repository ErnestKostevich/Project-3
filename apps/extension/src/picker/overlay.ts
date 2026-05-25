/**
 * Element-picker overlay.
 *
 * Renders inside a closed Shadow DOM rooted in a top-level <div> so the host
 * page's CSS cannot leak in (and our CSS does not leak out).
 *
 * Lifecycle:
 *   mountPickerOverlay({...}) → installs DOM + listeners
 *   handle.destroy()          → removes everything cleanly
 *
 * Visual states:
 *   1. Idle      — user hovers the page, highlight follows the cursor
 *   2. Selected  — user clicked an element; it stays outlined
 *   3. Inferring — toolbar shows a spinner while /api/infer runs
 *   4. Result    — toolbar swaps into a results panel
 */

import type { ElementPick, InferResponse } from '@pluck/shared';
import { computeDomPath, elementSampleHtml, elementSampleText } from '@/lib/dom-path';

export interface PickerOptions {
  onInfer: (picks: ElementPick[]) => Promise<InferResponse>;
  onClose: () => void;
}

export interface PickerHandle {
  destroy(): void;
}

const HOST_ID = 'pluck-picker-host';

export function mountPickerOverlay(opts: PickerOptions): PickerHandle {
  // Defensive: if a previous instance is still around, tear it down first.
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;';
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = STYLE + TOOLBAR_HTML;

  const toolbar = root.querySelector<HTMLDivElement>('#toolbar')!;
  const pickCountEl = root.querySelector<HTMLSpanElement>('#pick-count')!;
  const pickListEl = root.querySelector<HTMLDivElement>('#pick-list')!;
  const inferBtn = root.querySelector<HTMLButtonElement>('#infer-btn')!;
  const cancelBtn = root.querySelector<HTMLButtonElement>('#cancel-btn')!;
  const statusEl = root.querySelector<HTMLDivElement>('#status')!;
  const resultEl = root.querySelector<HTMLDivElement>('#result')!;

  const picks: Array<ElementPick & { element: Element }> = [];
  const HIGHLIGHT_OUTLINE = '2px solid #6366f1';
  const SELECTED_OUTLINE = '2px solid #10b981';
  const prevOutlines = new WeakMap<Element, string>();
  let hovered: Element | null = null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function isOverlayElement(el: Element | null): boolean {
    if (!el) return false;
    if (el.id === HOST_ID) return true;
    return host.contains(el);
  }

  function setHover(el: Element | null) {
    if (hovered === el) return;
    if (hovered && !isPicked(hovered)) restoreOutline(hovered);
    hovered = el;
    if (el && !isPicked(el)) {
      saveOutline(el);
      (el as HTMLElement).style.outline = HIGHLIGHT_OUTLINE;
      (el as HTMLElement).style.outlineOffset = '-2px';
    }
  }

  function saveOutline(el: Element) {
    if (!prevOutlines.has(el)) {
      prevOutlines.set(el, (el as HTMLElement).style.outline);
    }
  }

  function restoreOutline(el: Element) {
    const prev = prevOutlines.get(el);
    if (prev !== undefined) {
      (el as HTMLElement).style.outline = prev;
      prevOutlines.delete(el);
    }
  }

  function isPicked(el: Element): boolean {
    return picks.some((p) => p.element === el);
  }

  function markSelected(el: Element) {
    saveOutline(el);
    (el as HTMLElement).style.outline = SELECTED_OUTLINE;
    (el as HTMLElement).style.outlineOffset = '-2px';
  }

  function renderPickList() {
    pickCountEl.textContent = String(picks.length);
    pickListEl.innerHTML = picks
      .map(
        (p, i) => `
        <div class="pick-row">
          <input data-i="${i}" class="label-input" placeholder="column_${i + 1}"
                 value="${escapeAttr(p.label ?? '')}" />
          <span class="pick-text" title="${escapeAttr(p.sampleText)}">${escapeHtml(
            p.sampleText.slice(0, 40),
          )}</span>
          <button data-i="${i}" class="remove-btn" aria-label="Remove">✕</button>
        </div>`,
      )
      .join('');
    inferBtn.disabled = picks.length === 0;
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  function onMouseMove(e: MouseEvent) {
    const target = e.target as Element | null;
    if (isOverlayElement(target)) {
      setHover(null);
      return;
    }
    setHover(target);
  }

  function onClickCapture(e: MouseEvent) {
    const target = e.target as Element | null;
    if (isOverlayElement(target)) return; // let toolbar buttons work
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();

    if (isPicked(target)) {
      // Toggle off
      const idx = picks.findIndex((p) => p.element === target);
      picks.splice(idx, 1);
      restoreOutline(target);
    } else {
      markSelected(target);
      picks.push({
        element: target,
        domPath: computeDomPath(target),
        sampleText: elementSampleText(target),
        sampleHtml: elementSampleHtml(target),
      });
    }
    renderPickList();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      teardown();
      opts.onClose();
    }
  }

  function onPickListClick(e: Event) {
    const t = e.target as HTMLElement;
    if (t.classList.contains('remove-btn')) {
      const i = Number(t.dataset.i);
      const removed = picks.splice(i, 1)[0];
      if (removed) restoreOutline(removed.element);
      renderPickList();
    }
  }

  function onPickListInput(e: Event) {
    const t = e.target as HTMLInputElement;
    if (t.classList.contains('label-input')) {
      const i = Number(t.dataset.i);
      const pick = picks[i];
      if (pick) pick.label = t.value;
    }
  }

  async function runInfer() {
    inferBtn.disabled = true;
    cancelBtn.disabled = true;
    statusEl.textContent = 'Inferring pattern…';
    statusEl.classList.add('visible');
    try {
      const payload: ElementPick[] = picks.map(({ element: _el, ...rest }) => rest);
      const res = await opts.onInfer(payload);
      renderResult(res);
    } catch (err) {
      statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
      statusEl.classList.add('error');
    } finally {
      cancelBtn.disabled = false;
    }
  }

  function renderResult(res: InferResponse) {
    statusEl.classList.remove('visible');
    toolbar.classList.add('with-result');
    const cols = res.columns.map((c) => c.label);
    resultEl.innerHTML = `
      <div class="result-header">
        <strong>Pattern inferred</strong>
        <span class="confidence">confidence ${Math.round(res.confidence * 100)}%</span>
      </div>
      <div class="result-meta">
        <code>${escapeHtml(res.containerSelector)}</code>
      </div>
      <table class="result-table">
        <thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${res.sampleRows
            .map(
              (row) =>
                `<tr>${cols
                  .map((c) => `<td>${escapeHtml(String(row[c] ?? ''))}</td>`)
                  .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p class="result-note">This is a mocked response — Phase 1 of the roadmap replaces it with a real Claude call.</p>
    `;
    resultEl.classList.add('visible');
  }

  function teardown() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('keydown', onKeyDown, true);
    picks.forEach((p) => restoreOutline(p.element));
    if (hovered && !isPicked(hovered)) restoreOutline(hovered);
    host.remove();
  }

  // ── Wire up ──────────────────────────────────────────────────────────────

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('keydown', onKeyDown, true);
  pickListEl.addEventListener('click', onPickListClick);
  pickListEl.addEventListener('input', onPickListInput);
  inferBtn.addEventListener('click', runInfer);
  cancelBtn.addEventListener('click', () => {
    teardown();
    opts.onClose();
  });

  renderPickList();

  return {
    destroy() {
      teardown();
    },
  };
}

// ── Static markup + styles (inlined into the shadow root) ──────────────────

const TOOLBAR_HTML = /* html */ `
  <div id="toolbar">
    <header>
      <span class="brand">🍒 Pluck</span>
      <span class="hint">Click data on the page · <kbd>Esc</kbd> to cancel</span>
    </header>
    <div class="count-row">
      <span><span id="pick-count">0</span> picks</span>
      <div class="actions">
        <button id="cancel-btn" class="ghost">Cancel</button>
        <button id="infer-btn" class="primary" disabled>Infer pattern</button>
      </div>
    </div>
    <div id="pick-list"></div>
    <div id="status"></div>
    <div id="result"></div>
  </div>
`;

const STYLE = /* css */ `
<style>
  :host, * { box-sizing: border-box; }
  #toolbar {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 360px;
    max-height: calc(100vh - 32px);
    overflow: auto;
    background: white;
    color: #0a0a0a;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.18);
    font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: 12px;
    pointer-events: auto;
  }
  header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px;
  }
  .brand { font-weight: 700; }
  .hint { font-size: 11px; color: #737373; }
  kbd { background: #f4f4f5; border: 1px solid #e4e4e7; border-bottom-width: 2px; border-radius: 4px; padding: 0 4px; font: 11px ui-monospace, monospace; }
  .count-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .actions { display: flex; gap: 6px; }
  button {
    font: inherit; cursor: pointer; border-radius: 6px; padding: 6px 10px; border: 1px solid transparent;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .primary { background: #6366f1; color: white; border-color: #4f46e5; }
  .primary:hover:not(:disabled) { background: #4f46e5; }
  .ghost { background: white; border-color: #e5e5e5; }
  .ghost:hover { background: #f4f4f5; }
  #pick-list { display: flex; flex-direction: column; gap: 4px; }
  .pick-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 6px; align-items: center; padding: 4px; border: 1px solid #f4f4f5; border-radius: 6px; }
  .label-input { border: 1px solid #e5e5e5; border-radius: 4px; padding: 3px 6px; font: inherit; }
  .pick-text { color: #525252; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .remove-btn { background: transparent; border: none; color: #a3a3a3; padding: 2px 6px; }
  .remove-btn:hover { color: #ef4444; }
  #status { display: none; margin-top: 8px; padding: 6px 8px; border-radius: 6px; background: #f4f4f5; color: #525252; font-size: 12px; }
  #status.visible { display: block; }
  #status.error { background: #fef2f2; color: #b91c1c; }
  #result { display: none; margin-top: 12px; border-top: 1px solid #f4f4f5; padding-top: 12px; }
  #result.visible { display: block; }
  .result-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .confidence { font-size: 11px; color: #737373; }
  .result-meta { font-size: 11px; color: #737373; margin-bottom: 8px; }
  .result-meta code { background: #f4f4f5; padding: 2px 4px; border-radius: 4px; }
  .result-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .result-table th, .result-table td { text-align: left; padding: 4px 6px; border: 1px solid #f4f4f5; }
  .result-table th { background: #fafafa; }
  .result-note { margin-top: 8px; font-size: 11px; color: #a3a3a3; }
  @media (prefers-color-scheme: dark) {
    #toolbar { background: #0a0a0a; color: #fafafa; border-color: #262626; }
    .ghost { background: #0a0a0a; border-color: #262626; color: #fafafa; }
    .ghost:hover { background: #171717; }
    .label-input { background: #0a0a0a; border-color: #262626; color: #fafafa; }
    #status { background: #171717; color: #d4d4d4; }
    .result-meta code, kbd { background: #171717; color: #d4d4d4; border-color: #262626; }
    .pick-row, .result-table th, .result-table td { border-color: #262626; }
    .result-table th { background: #171717; }
  }
</style>
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
