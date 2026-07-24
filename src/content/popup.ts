// Anchored Shadow-DOM popup, ported from CCSD's ccai-popup: anchors at the
// click point, flips/clamps to stay on screen, re-clamps via ResizeObserver as
// streaming grows the box. All assistant output is rendered by building DOM
// nodes (mini markdown: bold / `code` / bullets) — never innerHTML.
import { POPUP_CSS } from './styles';

const MARGIN = 12; // min gap to viewport edges
const OFFSET = 10; // gap between click point and box

export interface PopupCallbacks {
  onSend: (text: string) => void;
  onClose: () => void;
  onOpenOptions: () => void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Inline segment renderer: **bold** and `code`. */
function renderInline(parent: HTMLElement, text: string): void {
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    if (m[1] !== undefined) {
      parent.appendChild(el('strong', undefined, m[1]));
    } else {
      parent.appendChild(el('code', undefined, m[2]));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
}

/** Mini markdown → DOM: paragraphs, bullet lists, bold, code. */
function renderMarkdown(container: HTMLElement, text: string): void {
  container.replaceChildren();
  let ul: HTMLUListElement | null = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/^#{1,4}\s+/, ''); // headings → plain bold-ish line
    const bullet = /^\s*(?:[-*\u2022]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      if (!ul) {
        ul = el('ul');
        container.appendChild(ul);
      }
      const li = el('li');
      renderInline(li, bullet[1]);
      ul.appendChild(li);
      continue;
    }
    ul = null;
    if (!line.trim()) continue;
    const p = el('p');
    renderInline(p, line);
    container.appendChild(p);
  }
}

export class Popup {
  readonly host: HTMLDivElement;
  private readonly box: HTMLDivElement;
  private readonly msgs: HTMLDivElement;
  private readonly inputEl: HTMLInputElement;
  private readonly sendBtn: HTMLButtonElement;
  private readonly cb: PopupCallbacks;
  private readonly x: number;
  private readonly y: number;
  private ro: ResizeObserver | null = null;
  private loader: HTMLDivElement | null = null;
  private assistantBubble: HTMLDivElement | null = null;
  private assistantRaw = '';
  private expanded = false;
  private readonly onResize = () => this.place();

  constructor(x: number, y: number, feature: string, cb: PopupCallbacks) {
    this.x = x;
    this.y = y;
    this.cb = cb;

    this.host = el('div');
    this.host.setAttribute('data-onboardai', '');
    const shadow = this.host.attachShadow({ mode: 'open' });
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(POPUP_CSS);
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      const style = el('style');
      style.textContent = POPUP_CSS;
      shadow.appendChild(style);
    }

    // --- box ---
    this.box = el('div', 'box');
    this.box.setAttribute('role', 'dialog');
    this.box.setAttribute('aria-label', `OnboardAI \u2014 ${feature}`);
    this.box.style.left = '-9999px';
    this.box.style.top = '-9999px';
    this.box.style.visibility = 'hidden';

    // header
    const header = el('div', 'header');
    const badge = el('span', 'badge', '\u2726 OnboardAI \u00b7 by Shoofly');
    const featureEl = el('span', 'feature', feature);
    featureEl.title = feature;
    const expandBtn = el('button', 'icon-btn', '\u2922');
    expandBtn.title = 'Expand';
    expandBtn.setAttribute('aria-label', 'Expand');
    expandBtn.addEventListener('click', () => {
      this.expanded = !this.expanded;
      this.box.classList.toggle('expanded', this.expanded);
      expandBtn.textContent = this.expanded ? '\u2921' : '\u2922';
      expandBtn.title = this.expanded ? 'Collapse' : 'Expand';
    });
    const closeBtn = el('button', 'icon-btn', '\u2715');
    closeBtn.title = 'Close';
    closeBtn.setAttribute('aria-label', 'Close OnboardAI');
    closeBtn.addEventListener('click', () => this.cb.onClose());
    header.append(badge, featureEl, expandBtn, closeBtn);

    // messages
    this.msgs = el('div', 'msgs');

    // footer
    const footer = el('div', 'footer');
    const inputRow = el('div', 'input-row');
    this.inputEl = el('input');
    this.inputEl.type = 'text';
    this.inputEl.placeholder = 'Ask a follow-up \u2014 try "what if\u2026"';
    this.inputEl.addEventListener('keydown', (e) => {
      e.stopPropagation(); // keep page hotkeys (e.g. GitHub's) out of the way
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      } else if (e.key === 'Escape') {
        this.cb.onClose();
      }
    });
    this.inputEl.addEventListener('input', () => this.syncSendState());
    this.sendBtn = el('button', 'send', '\u27a4');
    this.sendBtn.setAttribute('aria-label', 'Send');
    this.sendBtn.addEventListener('click', () => this.submit());
    inputRow.append(this.inputEl, this.sendBtn);
    const hint = el('p', 'hint', '\u2318-click anywhere to ask about it \u00b7 Esc to close');
    const lock = el('p', 'hint-lock', '\ud83d\udd12 Never reads what you type \u2014 form values stay on this page');
    footer.append(inputRow, hint, lock);

    this.box.append(header, this.msgs, footer);
    shadow.appendChild(this.box);
    document.documentElement.appendChild(this.host);

    this.place();
    this.ro = new ResizeObserver(() => this.place()); // re-clamp while streaming
    this.ro.observe(this.box);
    window.addEventListener('resize', this.onResize);
    this.inputEl.focus();
    this.syncSendState();
  }

  /** Anchor at the click point; flip/clamp so the box stays fully on screen. */
  private place(): void {
    const { width: w, height: h } = this.box.getBoundingClientRect();
    if (w === 0) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = this.x + OFFSET;
    let top = this.y + OFFSET;
    if (left + w > vw - MARGIN) left = this.x - w - OFFSET; // flip leftward
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    if (top + h > vh - MARGIN) top = this.y - h - OFFSET; // flip upward
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
    this.box.style.left = `${Math.round(left)}px`;
    this.box.style.top = `${Math.round(top)}px`;
    this.box.style.visibility = 'visible';
  }

  private submit(): void {
    const text = this.inputEl.value.trim();
    if (!text || this.isBusy()) return;
    this.inputEl.value = '';
    this.syncSendState();
    this.cb.onSend(text);
  }

  private isBusy(): boolean {
    // Busy for the whole stream (not just until the first delta) so a
    // mid-stream Enter can't silently drop a follow-up.
    return this.box.hasAttribute('aria-busy');
  }

  private syncSendState(): void {
    this.sendBtn.disabled = !this.inputEl.value.trim() || this.isBusy();
  }

  private scrollToBottom(): void {
    this.msgs.scrollTop = this.msgs.scrollHeight;
  }

  containsPath(path: EventTarget[]): boolean {
    return path.includes(this.host);
  }

  addUser(text: string): void {
    this.msgs.appendChild(el('div', 'msg-user', text));
    this.scrollToBottom();
  }

  /** New (empty) assistant bubble + 3-dot loader until the first delta. */
  startAssistant(): void {
    this.assistantRaw = '';
    this.assistantBubble = null;
    this.box.setAttribute('aria-busy', 'true');
    this.loader = el('div', 'loader');
    this.loader.append(el('span'), el('span'), el('span'));
    this.msgs.appendChild(this.loader);
    this.scrollToBottom();
    this.syncSendState();
  }

  appendDelta(text: string): void {
    if (this.loader) {
      this.loader.remove();
      this.loader = null;
      this.syncSendState();
    }
    if (!this.assistantBubble) {
      this.assistantBubble = el('div', 'msg-ai');
      this.msgs.appendChild(this.assistantBubble);
    }
    this.assistantRaw += text;
    renderMarkdown(this.assistantBubble, this.assistantRaw);
    this.scrollToBottom();
  }

  finishAssistant(): void {
    this.box.removeAttribute('aria-busy');
    if (this.loader) {
      this.loader.remove();
      this.loader = null;
    }
    this.assistantBubble = null;
    this.assistantRaw = '';
    this.syncSendState();
    this.inputEl.focus();
  }

  /**
   * One-time consent notice (Chrome Web Store User Data policy: prominent
   * disclosure BEFORE any page content is transmitted). Nothing is sent until
   * the user clicks "Got it" — the bubble then hands control back via onAccept.
   */
  showConsent(onAccept: () => void): void {
    const bubble = el('div', 'msg-consent');
    bubble.appendChild(
      document.createTextNode(
        'First time: OnboardAI sends the clicked element\u2019s text and nearby page text (never what you type \u2014 no form values, passwords, or URL tokens) to Anthropic to generate the answer, using your API key.'
      )
    );
    const btn = el('button', undefined, 'Got it \u2014 ask away');
    btn.addEventListener('click', () => {
      bubble.remove();
      onAccept();
    });
    bubble.appendChild(btn);
    this.msgs.appendChild(bubble);
    this.scrollToBottom();
    btn.focus();
  }

  /** Error bubble; `withSetup` adds an "Open settings" button (no_key/auth). */
  showError(message: string, withSetup: boolean): void {
    const bubble = el('div', 'msg-error');
    bubble.appendChild(document.createTextNode(message));
    if (withSetup) {
      const btn = el('button', undefined, 'Open OnboardAI settings');
      btn.addEventListener('click', () => this.cb.onOpenOptions());
      bubble.appendChild(btn);
    }
    this.msgs.appendChild(bubble);
    this.scrollToBottom();
  }

  destroy(): void {
    this.ro?.disconnect();
    this.ro = null;
    window.removeEventListener('resize', this.onResize);
    this.host.remove();
  }
}
