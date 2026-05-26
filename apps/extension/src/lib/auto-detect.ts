/**
 * Auto-detect repeating structures on the page.
 *
 * Three strategies, in order of confidence:
 *   1. <table><tbody><tr> with 3+ rows
 *   2. <ul|ol> with 3+ <li> children
 *   3. Any container with 3+ children that have the same tag + class signature
 *
 * Returns the top candidates sorted by item count. The picker uses the top
 * one to pre-fill picks when the user hits the "Auto-detect" button.
 */

export interface DetectedPattern {
  /** The container element holding the repeating items. */
  container: Element;
  /** The repeating items themselves. */
  items: Element[];
  /** Human-friendly description like "30 items in <ul.products>". */
  description: string;
}

const MIN_ITEMS = 3;
const MAX_RESULTS = 5;

export function detectPatterns(root: Document | Element = document): DetectedPattern[] {
  const found: DetectedPattern[] = [];
  const seen = new Set<Element>();

  // ── Strategy 1: tables ──────────────────────────────────────────────────
  for (const table of root.querySelectorAll('table')) {
    const tbody = table.querySelector('tbody') ?? table;
    const rows = Array.from(tbody.children).filter((c) => c.tagName === 'TR');
    if (rows.length >= MIN_ITEMS && !seen.has(tbody)) {
      seen.add(tbody);
      found.push({
        container: tbody,
        items: rows,
        description: `${rows.length} rows in ${describe(table)}`,
      });
    }
  }

  // ── Strategy 2: <ul> / <ol> ─────────────────────────────────────────────
  for (const list of root.querySelectorAll('ul, ol')) {
    const items = Array.from(list.children).filter((c) => c.tagName === 'LI');
    if (items.length >= MIN_ITEMS && !seen.has(list)) {
      seen.add(list);
      found.push({
        container: list,
        items,
        description: `${items.length} list items in ${describe(list)}`,
      });
    }
  }

  // ── Strategy 3: repeating siblings (same tag + class signature) ─────────
  // Scan likely container elements. Skip if container or any ancestor is
  // already a detected pattern (avoid duplicate "div containing a ul" rows).
  for (const container of root.querySelectorAll('div, section, article, main')) {
    if (seen.has(container)) continue;
    if (hasAncestorIn(container, seen)) continue;

    const children = Array.from(container.children);
    if (children.length < MIN_ITEMS) continue;

    // Group children by tag + first-two-classes signature.
    const groups = new Map<string, Element[]>();
    for (const child of children) {
      const sig = childSignature(child);
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig)!.push(child);
    }
    // Take the biggest group ≥ MIN_ITEMS and at least 60% of all children
    // (avoids spurious matches on containers with a few similar items mixed
    // with a lot of unrelated ones).
    let best: Element[] = [];
    for (const items of groups.values()) {
      if (items.length >= MIN_ITEMS && items.length / children.length >= 0.6 && items.length > best.length) {
        best = items;
      }
    }
    if (best.length >= MIN_ITEMS) {
      seen.add(container);
      found.push({
        container,
        items: best,
        description: `${best.length} repeating items in ${describe(container)}`,
      });
    }
  }

  return found.sort((a, b) => b.items.length - a.items.length).slice(0, MAX_RESULTS);
}

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = Array.from(el.classList).slice(0, 2).join('.');
  return `<${tag}${id}${cls ? '.' + cls : ''}>`;
}

function childSignature(el: Element): string {
  const tag = el.tagName;
  const classes = Array.from(el.classList).slice(0, 2).sort().join('.');
  return `${tag}.${classes}`;
}

function hasAncestorIn(el: Element, set: Set<Element>): boolean {
  let p: Element | null = el.parentElement;
  while (p) {
    if (set.has(p)) return true;
    p = p.parentElement;
  }
  return false;
}
