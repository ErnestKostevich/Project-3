/**
 * Compute a unique-enough CSS path for an element, walking up from the element
 * to the document root. Adds :nth-child() only when needed to disambiguate
 * among siblings of the same tag.
 *
 * The path is good enough to:
 *   - re-find the element on the same page snapshot
 *   - feed to the AI as an example for pattern inference
 *
 * It is *not* meant to be a robust long-term selector — pattern inference
 * generalizes from this into a relative selector inside a repeating container.
 */
export function computeDomPath(el: Element): string {
  if (!(el instanceof Element)) return '';
  const segments: string[] = [];
  let node: Element | null = el;

  while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.documentElement) {
    let segment = node.tagName.toLowerCase();

    // Add id if present and unique — short-circuits the walk.
    const id = node.id;
    if (id && document.querySelectorAll(`#${cssEscape(id)}`).length === 1) {
      segments.unshift(`#${cssEscape(id)}`);
      break;
    }

    // Add a couple of stable-looking classes.
    const classList = Array.from(node.classList).filter(isStableClass).slice(0, 2);
    if (classList.length > 0) {
      segment += '.' + classList.map(cssEscape).join('.');
    }

    // Disambiguate among same-tag siblings.
    const parent = node.parentElement;
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (c) => c.tagName === node!.tagName,
      );
      if (sameTagSiblings.length > 1) {
        const idx = sameTagSiblings.indexOf(node) + 1;
        segment += `:nth-of-type(${idx})`;
      }
    }

    segments.unshift(segment);
    node = node.parentElement;
  }

  return segments.join(' > ');
}

/** Classes that look auto-generated (hashes) are unstable; skip them. */
function isStableClass(cls: string): boolean {
  if (!cls) return false;
  // Skip Tailwind-style or hashed classes: long alnum, many digits, css-modules-like prefixes
  if (cls.length > 30) return false;
  if (/^[a-z]+_[a-z0-9]{5,}$/i.test(cls)) return false; // css-modules
  if (/^css-[a-z0-9]{4,}$/i.test(cls)) return false; // emotion
  if (/^_[a-z0-9]{4,}$/i.test(cls)) return false;
  return /^[a-z][a-z0-9_-]*$/i.test(cls);
}

/** CSS.escape polyfill-safe wrapper. */
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
  return s.replace(/([^\w-])/g, '\\$1');
}

/** Trimmed text content suitable for a sample. */
export function elementSampleText(el: Element, max = 500): string {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** outerHTML clipped to a max length, for the AI prompt. */
export function elementSampleHtml(el: Element, max = 2000): string {
  const html = el.outerHTML ?? '';
  return html.length > max ? html.slice(0, max) + '…' : html;
}
