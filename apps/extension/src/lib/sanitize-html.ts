/**
 * Strip a page's HTML down to what's useful for the AI:
 *   - remove <script>, <style>, <noscript>, <svg>, <iframe>
 *   - remove HTML comments
 *   - drop event handlers and style attrs
 *   - clip to a max length
 *
 * Run inside the content script (we have a live DOM) and serialize from a clone
 * so the user's page isn't mutated.
 */
export function sanitizePageHtml(maxChars = 80_000): string {
  const doc = document.cloneNode(true) as Document;

  // Remove noisy elements wholesale.
  doc
    .querySelectorAll(
      'script, style, noscript, iframe, svg, link[rel="stylesheet"], meta, video, audio, canvas',
    )
    .forEach((n) => n.remove());

  // Strip noisy attributes.
  const NOISY_ATTR_PREFIXES = ['on', 'aria-', 'data-test'];
  const NOISY_ATTRS = new Set(['style', 'srcset', 'sizes', 'integrity', 'crossorigin']);
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (NOISY_ATTRS.has(name) || NOISY_ATTR_PREFIXES.some((p) => name.startsWith(p))) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // Remove comments.
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  const comments: ChildNode[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) comments.push(n as ChildNode);
  comments.forEach((c) => c.remove());

  const html = doc.documentElement.outerHTML;
  return html.length > maxChars ? html.slice(0, maxChars) + '<!-- truncated -->' : html;
}
