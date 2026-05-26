/**
 * Element-picker overlay.
 *
 * Renders inside a closed Shadow DOM so host-page CSS can't leak in and our
 * CSS can't leak out. Lifecycle:
 *
 *   mountPickerOverlay({...}) → installs DOM + listeners
 *   handle.destroy()          → tears everything down cleanly
 *
 * Visual states (transitions in this order, but user can rewind via "Refine"):
 *   1. picking      — user hovers to highlight, clicks to (de)select example
 *      data. Toolbar shows the pick list.
 *   2. inferring    — toolbar shows a spinner while the AI proposes a schema.
 *   3. validating   — proposal in hand, we ran the selectors against the live
 *      DOM. Toolbar shows: rows-found count, real extracted preview table,
 *      action buttons: "Refine" / "Save as job" / "Cancel".
 *   4. saving       — name + optional schedule input; submit → save-job message.
 *
 * The picker is vanilla DOM (no React) on purpose — it has to be small,
 * standalone, and survive being injected into any page including ones with
 * aggressive CSP. React would add bundle weight and ceremony for no win.
 */

import type { ElementPick, InferResponse } from '@pluck/shared';
import { computeDomPath, elementSampleHtml, elementSampleText } from '@/lib/dom-path';
import { extractWithSchema } from '@/lib/selector-validation';
import { detectPatterns } from '@/lib/auto-detect';

export interface PickerOptions {
  onInfer: (picks: ElementPick[]) => Promise<InferResponse>;
  onSaveJob: (
    name: string,
    url: string,
    schema: InferResponse,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onClose: () => void;
}

export interface PickerHandle {
  destroy(): void;
}

const HOST_ID = 'pluck-picker-host';
const HIGHLIGHT_OUTLINE = '2px solid #6366f1';
const SELECTED_OUTLINE = '2px solid #10b981';
const MATCHED_OUTLINE = '2px dashed #10b981';

export function mountPickerOverlay(opts: PickerOptions): PickerHandle {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  // CRITICAL: pointer-events: none on the host so mouse events PASS THROUGH
  // to the page below. Without this, the host (full-viewport fixed div)
  // intercepts every click and hover — the picker toolbar shows but the page
  // appears to be "frozen". The toolbar itself is inside the shadow DOM
  // with its own pointer-events: auto, so its buttons still work.
  host.style.cssText =
    'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = STYLE + SHELL_HTML;
  const toolbar = root.querySelector<HTMLDivElement>('#toolbar')!;

  // ── State ────────────────────────────────────────────────────────────────

  type Mode = 'picking' | 'inferring' | 'validating' | 'saving';
  let mode: Mode = 'picking';
  const picks: Array<ElementPick & { element: Element }> = [];
  const prevOutlines = new WeakMap<Element, string>();
  let hovered: Element | null = null;
  let lastProposal: InferResponse | null = null;
  let matchedContainers: Element[] = [];

  // ── Outline management ──────────────────────────────────────────────────

  function saveOutline(el: Element) {
    if (!prevOutlines.has(el)) {
      prevOutlines.set(el, (el as HTMLElement).style.outline);
    }
  }

  function restoreOutline(el: Element) {
    const prev = prevOutlines.get(el);
    if (prev !== undefined) {
      const s = (el as HTMLElement).style;
      s.setProperty('outline', prev || '', '');
      s.removeProperty('outline-offset');
      s.removeProperty('box-shadow');
      prevOutlines.delete(el);
    }
  }

  // Set both `outline` AND `box-shadow` (with !important) so the highlight is
  // visible even on sites that aggressively override outline: none in their CSS.
  function setOutline(el: Element, value: string, color = '#6366f1') {
    saveOutline(el);
    const s = (el as HTMLElement).style;
    s.setProperty('outline', value, 'important');
    s.setProperty('outline-offset', '-2px', 'important');
    s.setProperty('box-shadow', `inset 0 0 0 2px ${color}, 0 0 0 2px ${color}`, 'important');
  }

  // Small visual flourish when a pick is added — quick pulse on the element.
  function pulseElement(el: Element) {
    const s = (el as HTMLElement).style;
    const original = s.getPropertyValue('transform');
    s.setProperty('transition', 'transform 0.18s ease-out', 'important');
    s.setProperty('transform', `${original} scale(1.02)`, 'important');
    setTimeout(() => {
      s.setProperty('transform', original, '');
      setTimeout(() => {
        s.removeProperty('transition');
      }, 200);
    }, 180);
  }

  function isOverlayElement(el: Element | null): boolean {
    return !!el && (el.id === HOST_ID || host.contains(el));
  }

  function isPicked(el: Element): boolean {
    return picks.some((p) => p.element === el);
  }

  function clearAllOutlines() {
    if (hovered && !isPicked(hovered)) restoreOutline(hovered);
    for (const p of picks) restoreOutline(p.element);
    for (const c of matchedContainers) restoreOutline(c);
    matchedContainers = [];
    hovered = null;
  }

  // ── Hover + click handlers (picking mode only) ──────────────────────────

  function onMouseMove(e: MouseEvent) {
    if (mode !== 'picking') return;
    const target = e.target as Element | null;
    if (isOverlayElement(target)) {
      if (hovered && !isPicked(hovered)) restoreOutline(hovered);
      hovered = null;
      return;
    }
    if (target === hovered) return;
    if (hovered && !isPicked(hovered)) restoreOutline(hovered);
    hovered = target;
    if (target && !isPicked(target)) setOutline(target, HIGHLIGHT_OUTLINE, '#6366f1');
  }

  // Capture-phase click handler. Wrapped in try/catch — silent failures here
  // are the worst kind of bug (user clicks, nothing happens, no error).
  function onClickCapture(e: MouseEvent) {
    try {
      if (mode !== 'picking') return;
      const target = e.target as Element | null;
      if (!target) return;
      if (isOverlayElement(target)) return;

      e.preventDefault();
      e.stopPropagation();
      // stopImmediate too — some sites attach their own capture-phase
      // listeners; without this, their handler could still fire and navigate.
      e.stopImmediatePropagation?.();

      if (isPicked(target)) {
        const idx = picks.findIndex((p) => p.element === target);
        picks.splice(idx, 1);
        restoreOutline(target);
        console.log('[Pluck picker] removed pick → now', picks.length);
      } else {
        setOutline(target, SELECTED_OUTLINE, '#10b981');
        // Compute metadata in a try/catch so a single bad element doesn't
        // silently kill the whole picker. Fall back to tag name on failure.
        let domPath = target.tagName.toLowerCase();
        let sampleText = '';
        let sampleHtml = '';
        try {
          domPath = computeDomPath(target) || domPath;
          sampleText = elementSampleText(target);
          sampleHtml = elementSampleHtml(target);
        } catch (err) {
          console.warn('[Pluck picker] metadata extraction failed; using fallback', err);
        }
        picks.push({ element: target, domPath, sampleText, sampleHtml });
        pulseElement(target);
        console.log('[Pluck picker] added pick →', picks.length, domPath);
      }
      render();
    } catch (err) {
      console.error('[Pluck picker] click handler crashed', err);
      // Best-effort: surface in the toolbar so the user knows something happened.
      const statusEl = toolbar.querySelector<HTMLDivElement>('#status');
      if (statusEl) {
        statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
        statusEl.className = 'status error';
      }
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      teardown();
      opts.onClose();
    }
  }

  // ── Mode transitions ────────────────────────────────────────────────────

  async function startInfer() {
    if (picks.length === 0) return;
    mode = 'inferring';
    render();
    try {
      const payload: ElementPick[] = picks.map(({ element: _el, ...rest }) => rest);
      const proposal = await opts.onInfer(payload);
      lastProposal = proposal;
      enterValidation();
    } catch (err) {
      lastProposal = null;
      mode = 'picking';
      // CRITICAL: re-render the picking view FIRST so the toolbar has a
      // #status element to write the error into. Without this call, the
      // toolbar was stuck on the inferring spinner forever.
      render();
      renderError(err instanceof Error ? err.message : String(err));
      console.error('[Pluck picker] inference failed:', err);
    }
  }

  function enterValidation() {
    if (!lastProposal) return;
    mode = 'validating';

    // Drop user-pick outlines; we now highlight matched containers instead.
    for (const p of picks) restoreOutline(p.element);
    for (const c of matchedContainers) restoreOutline(c);
    matchedContainers = [];

    const result = extractWithSchema(lastProposal);
    for (const el of result.elements) setOutline(el, MATCHED_OUTLINE);
    matchedContainers = result.elements;

    render(result);
  }

  function backToPicking() {
    mode = 'picking';
    // Restore pick outlines, drop matched-container highlights.
    for (const c of matchedContainers) restoreOutline(c);
    matchedContainers = [];
    for (const p of picks) setOutline(p.element, SELECTED_OUTLINE);
    render();
  }

  async function saveAsJob(name: string) {
    if (!lastProposal) return;
    mode = 'saving';
    render();
    const reply = await opts.onSaveJob(name, window.location.href, lastProposal);
    if (reply.ok) {
      renderSavedConfirmation(name);
      setTimeout(() => {
        teardown();
        opts.onClose();
      }, 1400);
    } else {
      mode = 'validating';
      renderError(reply.error);
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  function render(validationResult?: ReturnType<typeof extractWithSchema>) {
    switch (mode) {
      case 'picking':
        renderPicking();
        break;
      case 'inferring':
        renderInferring();
        break;
      case 'validating':
        renderValidating(validationResult ?? extractWithSchema(lastProposal!));
        break;
      case 'saving':
        renderSaving();
        break;
    }
  }

  function renderPicking() {
    // Empty state: dedicate the whole toolbar to a clear "what to do" prompt,
    // plus a one-click "Auto-detect" shortcut for pages with obvious repeating
    // structures (lists, tables, grids of cards).
    if (picks.length === 0) {
      let detected: ReturnType<typeof detectPatterns> = [];
      try {
        detected = detectPatterns();
      } catch (err) {
        console.warn('[Pluck picker] auto-detect failed', err);
      }
      const autoHtml = detected.length
        ? `<div class="auto-detect">
            <div class="auto-detect-label">✨ Auto-detected on this page</div>
            ${detected
              .slice(0, 3)
              .map(
                (p, i) => `
                <button class="auto-btn" data-i="${i}">
                  <span class="auto-count">${p.items.length}</span>
                  <span class="auto-desc">${escapeHtml(p.description)}</span>
                  <span class="auto-go">Use →</span>
                </button>`,
              )
              .join('')}
            <div class="auto-or">— or pick manually —</div>
          </div>`
        : '';

      toolbar.innerHTML = `
        <header>
          <span class="brand">🍒 Pluck</span>
          <span class="hint"><kbd>Esc</kbd> to cancel</span>
        </header>
        ${autoHtml}
        <div class="empty-instr">
          <div class="empty-step">
            <span class="step-num">1</span>
            <div>
              <strong>Hover over the page</strong>
              <p>Indigo outline follows your cursor.</p>
            </div>
          </div>
          <div class="empty-step">
            <span class="step-num">2</span>
            <div>
              <strong>Click 2–3 example data points</strong>
              <p>Like one product name and one price. They'll outline green.</p>
            </div>
          </div>
          <div class="empty-step">
            <span class="step-num">3</span>
            <div>
              <strong>Hit "Infer pattern"</strong>
              <p>AI figures out every other row like them.</p>
            </div>
          </div>
        </div>
        <div class="count-row">
          <span class="count-label"><span id="pick-count">0</span> picks</span>
          <div class="actions">
            <button id="cancel-btn" class="ghost">Cancel</button>
            <button id="infer-btn" class="primary" disabled>Infer pattern</button>
          </div>
        </div>
        <div id="status"></div>
      `;
      bindPickingHandlers();
      bindAutoDetectHandlers(detected);
      return;
    }

    // Compact "in progress" state once the user has picked something.
    toolbar.innerHTML = `
      <header>
        <span class="brand">🍒 Pluck</span>
        <span class="hint"><strong style="color: #10b981;">${picks.length} pick${
          picks.length === 1 ? '' : 's'
        }</strong> · <kbd>Esc</kbd> to cancel</span>
      </header>
      <div class="count-row">
        <span class="count-label">Click more, or hit Infer ↓</span>
        <div class="actions">
          <button id="cancel-btn" class="ghost">Cancel</button>
          <button id="infer-btn" class="primary">Infer pattern</button>
        </div>
      </div>
      <div id="pick-list">
        ${picks
          .map(
            (p, i) => `
            <div class="pick-row">
              <input data-i="${i}" class="label-input" placeholder="column_${i + 1}"
                     value="${escapeAttr(p.label ?? '')}" />
              <span class="pick-text" title="${escapeAttr(p.sampleText)}">${escapeHtml(
                p.sampleText.slice(0, 40) || '(no text)',
              )}</span>
              <button data-i="${i}" class="remove-btn" aria-label="Remove">✕</button>
            </div>`,
          )
          .join('')}
      </div>
      <div id="status"></div>
    `;
    bindPickingHandlers();
  }

  function renderInferring() {
    toolbar.innerHTML = `
      <header>
        <span class="brand">🍒 Pluck</span>
      </header>
      <div class="loading">
        <div class="spinner"></div>
        <div>
          <strong>Inferring pattern…</strong>
          <p>Sending your picks to the AI provider.</p>
        </div>
      </div>
    `;
  }

  function renderValidating(result: ReturnType<typeof extractWithSchema>) {
    if (!lastProposal) return;
    const cols = lastProposal.columns.map((c) => c.label);
    const sampleRows = result.rows.slice(0, 5);
    const tableHtml = sampleRows.length
      ? `<table class="result-table">
           <thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
           <tbody>
             ${sampleRows
               .map(
                 (row) =>
                   `<tr>${cols
                     .map((c) => `<td>${escapeHtml((row[c] ?? '').slice(0, 80))}</td>`)
                     .join('')}</tr>`,
               )
               .join('')}
           </tbody>
         </table>`
      : `<div class="empty-result">No matches on this page. Try refining your picks.</div>`;

    toolbar.innerHTML = `
      <header>
        <span class="brand">🍒 Pluck</span>
        <span class="hint">${result.containerMatches} row${
          result.containerMatches === 1 ? '' : 's'
        } highlighted</span>
      </header>
      <div class="result-meta">
        <code>${escapeHtml(lastProposal.containerSelector)}</code>
        <span class="confidence">confidence ${Math.round(lastProposal.confidence * 100)}%</span>
      </div>
      ${tableHtml}
      <div class="actions-row">
        <button id="refine-btn" class="ghost">← Refine picks</button>
        <button id="save-btn" class="primary" ${
          result.containerMatches === 0 ? 'disabled' : ''
        }>Save as job</button>
      </div>
      <div id="status"></div>
    `;
    bindValidationHandlers();
  }

  function renderSaving() {
    const defaultName = document.title.slice(0, 60) || new URL(window.location.href).hostname;
    toolbar.innerHTML = `
      <header>
        <span class="brand">🍒 Pluck</span>
      </header>
      <div class="save-form">
        <label>
          Job name
          <input id="save-name" value="${escapeAttr(defaultName)}" />
        </label>
        <p class="callout">
          The job is saved in your browser. Re-run it any time from the extension popup, or schedule
          automatic runs from Settings (Pro feature).
        </p>
        <div class="actions-row">
          <button id="save-back-btn" class="ghost">← Back</button>
          <button id="save-confirm-btn" class="primary">Save</button>
        </div>
      </div>
      <div id="status"></div>
    `;
    bindSavingHandlers();
  }

  function renderSavedConfirmation(name: string) {
    toolbar.innerHTML = `
      <header>
        <span class="brand">🍒 Pluck</span>
      </header>
      <div class="loading" style="color: var(--success);">
        <div style="font-size: 28px;">✓</div>
        <div>
          <strong>Saved.</strong>
          <p>"${escapeHtml(name)}" is now in your popup. Closing in a moment…</p>
        </div>
      </div>
    `;
  }

  function renderError(message: string) {
    // Append to whatever the current view rendered.
    const statusEl = toolbar.querySelector<HTMLDivElement>('#status');
    if (statusEl) {
      statusEl.textContent = `Error: ${message}`;
      statusEl.className = 'status error';
    }
  }

  // ── Handler bindings ────────────────────────────────────────────────────

  function bindAutoDetectHandlers(detected: ReturnType<typeof detectPatterns>) {
    toolbar.querySelectorAll<HTMLButtonElement>('.auto-btn').forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.dataset.i);
        const pattern = detected[i];
        if (!pattern) return;
        const firstItem = pattern.items[0];
        if (!firstItem) return;
        try {
          // Pick the first item of the detected pattern as a single example.
          // The user can hit Infer immediately, or click INSIDE this item to
          // add column-level picks for refinement.
          setOutline(firstItem, SELECTED_OUTLINE, '#10b981');
          let domPath = firstItem.tagName.toLowerCase();
          let sampleText = '';
          let sampleHtml = '';
          try {
            domPath = computeDomPath(firstItem) || domPath;
            sampleText = elementSampleText(firstItem);
            sampleHtml = elementSampleHtml(firstItem);
          } catch (err) {
            console.warn('[Pluck picker] auto-pick metadata failed', err);
          }
          picks.push({
            element: firstItem,
            domPath,
            sampleText,
            sampleHtml,
            label: 'row',
          });
          // Briefly flash the other matched items so the user sees what was
          // auto-found, then restore the styling.
          for (const item of pattern.items.slice(1, 12)) {
            setOutline(item, MATCHED_OUTLINE, '#10b981');
          }
          setTimeout(() => {
            for (const item of pattern.items.slice(1, 12)) {
              if (!isPicked(item)) restoreOutline(item);
            }
          }, 1500);
          console.log('[Pluck picker] auto-detect picked', pattern.description);
          render();
        } catch (err) {
          console.error('[Pluck picker] auto-detect pick failed', err);
        }
      };
    });
  }

  function bindPickingHandlers() {
    toolbar.querySelector<HTMLButtonElement>('#cancel-btn')!.onclick = () => {
      teardown();
      opts.onClose();
    };
    toolbar.querySelector<HTMLButtonElement>('#infer-btn')!.onclick = () => startInfer();

    toolbar.querySelectorAll<HTMLButtonElement>('.remove-btn').forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.dataset.i);
        const removed = picks.splice(i, 1)[0];
        if (removed) restoreOutline(removed.element);
        renderPicking();
      };
    });

    toolbar.querySelectorAll<HTMLInputElement>('.label-input').forEach((inp) => {
      inp.oninput = () => {
        const i = Number(inp.dataset.i);
        const pick = picks[i];
        if (pick) pick.label = inp.value;
      };
    });
  }

  function bindValidationHandlers() {
    toolbar.querySelector<HTMLButtonElement>('#refine-btn')!.onclick = () => backToPicking();
    toolbar.querySelector<HTMLButtonElement>('#save-btn')!.onclick = () => {
      mode = 'saving';
      render();
    };
  }

  function bindSavingHandlers() {
    toolbar.querySelector<HTMLButtonElement>('#save-back-btn')!.onclick = () => {
      mode = 'validating';
      render();
    };
    toolbar.querySelector<HTMLButtonElement>('#save-confirm-btn')!.onclick = () => {
      const name = toolbar.querySelector<HTMLInputElement>('#save-name')!.value.trim();
      if (!name) return;
      saveAsJob(name);
    };
  }

  // ── Teardown ────────────────────────────────────────────────────────────

  function teardown() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('keydown', onKeyDown, true);
    clearAllOutlines();
    host.remove();
  }

  // ── Wire up ─────────────────────────────────────────────────────────────

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('keydown', onKeyDown, true);

  render();

  return {
    destroy() {
      teardown();
    },
  };
}

// ── Static markup + styles ─────────────────────────────────────────────────

const SHELL_HTML = /* html */ `<div id="toolbar"></div>`;

const STYLE = /* css */ `
<style>
  :host, * { box-sizing: border-box; }
  :host {
    --bg: white;
    --fg: #0a0a0a;
    --fg-muted: #525252;
    --fg-subtle: #737373;
    --border: #e5e5e5;
    --bg-elev: #fafafa;
    --accent: #6366f1;
    --accent-strong: #4f46e5;
    --success: #10b981;
    --danger: #ef4444;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --bg: #0a0a0a;
      --fg: #fafafa;
      --fg-muted: #d4d4d4;
      --fg-subtle: #a3a3a3;
      --border: #262626;
      --bg-elev: #171717;
    }
  }
  #toolbar {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 380px;
    max-height: calc(100vh - 32px);
    overflow: auto;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.18);
    font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: 12px;
    pointer-events: auto;
  }
  header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 10px;
  }
  .brand { font-weight: 700; }
  .hint { font-size: 11px; color: var(--fg-subtle); }
  kbd {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-bottom-width: 2px;
    border-radius: 4px;
    padding: 0 4px;
    font: 11px ui-monospace, monospace;
  }
  .count-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .actions, .actions-row { display: flex; gap: 6px; }
  .actions-row { justify-content: space-between; margin-top: 10px; }
  button {
    font: inherit; cursor: pointer; border-radius: 6px; padding: 6px 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  button:hover:not(:disabled) { background: var(--bg-elev); }
  .primary {
    background: var(--accent); color: white; border-color: var(--accent-strong);
  }
  .primary:hover:not(:disabled) { background: var(--accent-strong); }
  .ghost { background: var(--bg); }
  #pick-list { display: flex; flex-direction: column; gap: 4px; }
  .pick-row {
    display: grid; grid-template-columns: 110px 1fr auto; gap: 6px; align-items: center;
    padding: 4px; border: 1px solid var(--border); border-radius: 6px;
  }
  .label-input {
    border: 1px solid var(--border); border-radius: 4px; padding: 3px 6px;
    font: inherit; font-size: 12px;
    background: var(--bg); color: var(--fg);
  }
  .pick-text {
    color: var(--fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: 12px;
  }
  .remove-btn {
    background: transparent; border: none; color: var(--fg-subtle); padding: 2px 6px;
  }
  .remove-btn:hover { color: var(--danger); }
  #status { display: none; margin-top: 8px; padding: 6px 8px; border-radius: 6px; font-size: 12px; }
  #status.error {
    display: block; background: rgba(239,68,68,0.1); color: var(--danger);
    border: 1px solid rgba(239,68,68,0.3);
  }
  .loading {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0;
  }
  .loading p { margin: 4px 0 0; font-size: 12px; color: var(--fg-muted); }
  .spinner {
    width: 28px; height: 28px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .result-meta {
    display: flex; justify-content: space-between; gap: 8px;
    font-size: 11px; color: var(--fg-subtle); margin-bottom: 8px;
  }
  .result-meta code {
    background: var(--bg-elev); padding: 2px 6px; border-radius: 4px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    max-width: 240px;
  }
  .result-table {
    width: 100%; border-collapse: collapse; font-size: 12px;
  }
  .result-table th, .result-table td {
    text-align: left; padding: 4px 6px; border: 1px solid var(--border);
    max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .result-table th { background: var(--bg-elev); font-weight: 600; }
  .empty-result {
    padding: 12px; text-align: center; color: var(--fg-subtle); font-size: 12px;
    background: var(--bg-elev); border-radius: 6px;
  }
  .empty-instr {
    display: flex; flex-direction: column; gap: 12px;
    padding: 6px 0 12px;
  }
  .empty-step {
    display: flex; gap: 12px; align-items: flex-start;
  }
  .empty-step .step-num {
    flex-shrink: 0;
    width: 24px; height: 24px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    font-weight: 700; font-size: 12px;
    display: flex; align-items: center; justify-content: center;
  }
  .empty-step strong { display: block; color: var(--fg); font-size: 13px; }
  .empty-step p {
    margin: 2px 0 0; color: var(--fg-muted); font-size: 12px; line-height: 1.4;
  }
  .count-label {
    color: var(--fg-muted); font-size: 12px;
  }
  .auto-detect {
    display: flex; flex-direction: column; gap: 6px;
    padding: 10px;
    margin-bottom: 10px;
    background: linear-gradient(135deg, rgba(99,102,241,0.10), rgba(16,185,129,0.08));
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 8px;
  }
  .auto-detect-label {
    font-size: 11px; font-weight: 600;
    color: var(--fg);
    letter-spacing: 0.02em;
  }
  .auto-btn {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: border-color 100ms, transform 100ms;
    font: inherit;
    color: inherit;
  }
  .auto-btn:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  .auto-count {
    background: var(--accent);
    color: white;
    font-weight: 700;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 99px;
  }
  .auto-desc {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    color: var(--fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .auto-go {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
  }
  .auto-or {
    font-size: 10px;
    color: var(--fg-subtle);
    text-align: center;
    padding-top: 4px;
  }
  .save-form { display: flex; flex-direction: column; gap: 10px; }
  .save-form label {
    display: flex; flex-direction: column; gap: 4px;
    font-size: 12px; color: var(--fg-muted);
  }
  .save-form input {
    padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--bg); color: var(--fg); font: inherit; font-size: 13px;
  }
  .callout {
    background: var(--bg-elev); border: 1px solid var(--border);
    padding: 8px 10px; border-radius: 6px;
    font-size: 11px; color: var(--fg-muted); margin: 0;
    line-height: 1.5;
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
