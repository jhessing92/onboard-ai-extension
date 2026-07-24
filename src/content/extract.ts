// Feature-label ladder + budgeted page-context extraction. The context block
// is serialized as labeled plain text (~6k chars max) and travels to the
// background worker, which appends it to the system prompt.
//
// PRIVACY INVARIANTS (see PRIVACY.md):
// - form field values are never read (`value` is not whitelisted; controls are
//   emptied in sanitizedHtml)
// - contenteditable content (rich-text editors, live previews) is never read
// - only origin + pathname of the URL are sent — query strings and hashes
//   (which can carry tokens) never leave the page
// - email addresses are scrubbed from the page title before it is sent

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '\u2026' : s;
}

/** Replace email addresses (titles often embed the signed-in user's) . */
function scrubEmails(s: string): string {
  return s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '(email)');
}

/** True for elements whose text is (or may become) user-typed. */
function isEditable(el: Element): boolean {
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  const v = el.getAttribute('contenteditable');
  return v !== null && v.toLowerCase() !== 'false';
}

/** Site name from document.title: strip " | Site", " – Site" style suffixes. */
function cleanedTitle(): string {
  const t = scrubEmails(clean(document.title));
  const first = t.split(/\s+[|\u2013\u2014\u00b7-]\s+/)[0];
  return first || t;
}

const INTERACTIVE =
  'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="link"], summary, label, input, select, textarea';

export interface ResolvedTarget {
  /** The element the label was resolved from — ring/ask about THIS one. */
  el: Element;
  label: string;
}

/** Best human label for what was clicked, walking up from the target.
 * Nearest ancestor wins: a clicked link's own text beats an aria-label on a
 * grandparent container (e.g. Wikipedia's labeled sidebar nav boxes).
 * Returns the element the label came from so the spotlight ring and the AI
 * context reference the same node (span-inside-button resolves to the button). */
export function resolveTarget(target: Element): ResolvedTarget {
  // 1./2. Walk up: first aria-label OR interactive control with a label.
  // PRIVACY: never read a form field's value — the only exception is
  // button-type inputs, whose "value" is their visible label, not user data.
  // Editable elements (contenteditable editors/live previews) are skipped
  // entirely: their text — and even aria-labels some apps mirror text into —
  // can contain what the user typed.
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    if (isEditable(el)) continue;
    const isFormControl = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
    if (!isFormControl) {
      const aria = clean(el.getAttribute('aria-label'));
      if (aria) return { el, label: truncate(aria, 80) };
    }
    if (!el.matches(INTERACTIVE)) continue;
    const img = el.querySelector('img[alt]');
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    const isButtonInput = el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(type);
    const t =
      (isFormControl && !isButtonInput ? '' : clean(el.textContent)) ||
      clean(el.getAttribute('placeholder')) ||
      clean(el.getAttribute('title')) ||
      clean(img?.getAttribute('alt')) ||
      (isButtonInput ? clean((el as HTMLInputElement).value) : '');
    if (t) return { el, label: truncate(t, 80) };
    if (isFormControl) {
      return { el, label: type ? `${type} input field` : 'input field' };
    }
  }
  // 3. Nearest section heading
  const heading = nearestHeading(target);
  if (heading) return { el: target, label: truncate(heading, 80) };
  // 4. The page itself
  const title = cleanedTitle();
  return { el: target, label: title ? `${truncate(title, 60)} page` : 'this page' };
}

/** Thin wrapper kept for callers that only need the label. */
export function extractFeature(target: Element): string {
  return resolveTarget(target).label;
}

function nearestHeading(target: Element): string {
  let el: Element | null = target.closest(
    'section, article, form, fieldset, nav, aside, header, main, [role="region"], [role="dialog"]'
  );
  while (el) {
    const h = el.querySelector('h1, h2, h3, h4, legend, [role="heading"]');
    const t = clean(h?.textContent);
    if (t) return t;
    el = el.parentElement?.closest(
      'section, article, form, fieldset, nav, aside, header, main, [role="region"], [role="dialog"]'
    ) ?? null;
  }
  return '';
}

// --- context block -------------------------------------------------------

// PRIVACY: `value` is deliberately NOT whitelisted — pre-filled form values
// (and anything else user-specific) must never travel into the AI context.
const ATTR_WHITELIST =
  /^(id|class|href|src|role|type|name|title|alt|placeholder|for|action|method|datetime|colspan|rowspan|aria-.+|data-testid)$/;

/** Serialize an element's outerHTML keeping only whitelisted attrs, budgeted. */
function sanitizedHtml(el: Element, budget: number): string {
  const clone = el.cloneNode(true) as Element;
  const all = [clone, ...Array.from(clone.querySelectorAll('*'))];
  for (const node of all) {
    if (
      /^(script|style|svg|iframe|video|audio|canvas|input|textarea|select)$/i.test(node.tagName) ||
      isEditable(node) // clone is detached, so this hits the attribute check
    ) {
      node.replaceChildren(); // form controls / editors: keep the (sanitized) tag, drop contents
    }
    for (const attr of Array.from(node.attributes)) {
      if (!ATTR_WHITELIST.test(attr.name)) {
        node.removeAttribute(attr.name);
      } else if (attr.value.length > 120) {
        node.setAttribute(attr.name, attr.value.slice(0, 117) + '...');
      }
    }
  }
  return truncate(clone.outerHTML.replace(/\s+/g, ' '), budget);
}

/** Element text with any contenteditable content stripped out. */
function textExcludingEditable(el: Element): string {
  if (isEditable(el)) return '';
  if (!el.querySelector('[contenteditable]')) {
    return clean((el as HTMLElement).innerText ?? el.textContent);
  }
  const clone = el.cloneNode(true) as Element;
  for (const ed of Array.from(clone.querySelectorAll('[contenteditable]'))) {
    if ((ed.getAttribute('contenteditable') ?? '').toLowerCase() === 'false') continue;
    ed.remove();
  }
  return clean(clone.textContent);
}

/** Walk up until we find a container with a meaningful amount of text.
 * PRIVACY: contenteditable subtrees are excluded at every level. */
function surroundingText(target: Element, budget: number): string {
  let el: Element | null = target;
  while (el && el !== document.body) {
    const t = textExcludingEditable(el);
    if (t.length >= 80) return truncate(t, budget);
    el = el.parentElement;
  }
  return document.body ? truncate(textExcludingEditable(document.body), budget) : '';
}

function navSummary(budget: number): string {
  const links = document.querySelectorAll('nav a, [role="navigation"] a, header a');
  const seen = new Set<string>();
  for (const a of Array.from(links)) {
    const t = clean(a.textContent);
    if (t && t.length <= 40) seen.add(t);
    if (seen.size >= 25) break;
  }
  return truncate(Array.from(seen).join(' \u00b7 '), budget);
}

function landmarkSummary(budget: number): string {
  const parts: string[] = [];
  const present = ['main', 'nav', 'aside', 'header', 'footer', 'form', 'dialog[open]']
    .filter((sel) => document.querySelector(sel))
    .join(', ');
  if (present) parts.push(`landmarks: ${present}`);
  const headings = Array.from(document.querySelectorAll('h1, h2'))
    .map((h) => clean(h.textContent))
    .filter((t) => t && t.length <= 80)
    .slice(0, 8);
  if (headings.length > 0) parts.push(`top headings: ${headings.join(' | ')}`);
  return truncate(parts.join('; '), budget);
}

/** ~6k char labeled plain-text context block for the clicked element. */
export function extractContext(target: Element, feature: string): string {
  const parts: string[] = [];
  // PRIVACY: origin + pathname only — query strings and hashes can carry
  // session tokens, reset links, OAuth codes.
  parts.push(`URL: ${location.origin + location.pathname}`);
  parts.push(`PAGE TITLE: ${scrubEmails(clean(document.title))}`);
  const desc = document
    .querySelector('meta[name="description"], meta[property="og:description"]')
    ?.getAttribute('content');
  if (desc) parts.push(`META DESCRIPTION: ${truncate(clean(desc), 300)}`);
  parts.push(`CLICKED ELEMENT (label): ${feature}`);
  parts.push(`CLICKED ELEMENT (html): ${sanitizedHtml(target, 1000)}`);
  const heading = nearestHeading(target);
  if (heading) parts.push(`NEAREST SECTION HEADING: ${truncate(heading, 120)}`);
  const around = surroundingText(target, 300);
  if (around) parts.push(`SURROUNDING TEXT: ${around}`);
  const nav = navSummary(400);
  if (nav) parts.push(`SITE NAVIGATION: ${nav}`);
  const landmarks = landmarkSummary(400);
  if (landmarks) parts.push(`PAGE STRUCTURE: ${landmarks}`);
  return parts.join('\n').slice(0, 6000);
}
