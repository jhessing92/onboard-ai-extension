// Option-click (Mac) / Alt-click (Win) trigger:
// - while Option/Alt is held, a class on <html> swaps the cursor to the
//   OnboardAI sparkle (rule injected via constructed stylesheet — CSP-safe)
//   and onModifier(true) fires once (edge-triggered) for the spotlight
// - capture-phase click/mousedown/auxclick listeners swallow the event so the
//   underlying control never activates, then fire the trigger callback
// - blur + visibilitychange clear the cursor AND emit onModifier(false) so
//   switching apps never leaves a stuck cursor or spotlight.

export interface TriggerEvent {
  /** Viewport coords of the click (popup anchor point). */
  x: number;
  y: number;
  target: Element;
}

export interface TriggerOptions {
  isEnabled: () => boolean;
  /** True if the event path goes through our popup — leave those clicks alone. */
  isOurNode: (path: EventTarget[]) => boolean;
  onTrigger: (t: TriggerEvent) => void;
  /** Edge-triggered: fires once per modifier hold start (true) / end (false). */
  onModifier?: (held: boolean) => void;
}

const CURSOR_CLASS = '__onboardai-cmd';

function installCursorStyle(): void {
  const url = chrome.runtime.getURL('cursor.png');
  const css = `html.${CURSOR_CLASS}, html.${CURSOR_CLASS} * { cursor: url("${url}") 16 16, help !important; }`;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    // Older Chrome without adoptedStyleSheets on Document — <style> fallback.
    const style = document.createElement('style');
    style.textContent = css;
    (document.head ?? document.documentElement).appendChild(style);
  }
}

export interface Trigger {
  /** Force-clear the cursor/modifier state (e.g. when toggled off). */
  reset: () => void;
}

export function initTrigger(opts: TriggerOptions): Trigger {
  installCursorStyle();

  let held = false;
  const setHeld = (on: boolean) => {
    const next = on && opts.isEnabled();
    document.documentElement.classList.toggle(CURSOR_CLASS, next);
    if (next !== held) {
      held = next;
      opts.onModifier?.(held);
    }
  };
  const clearHeld = () => setHeld(false);

  const keyHandler = (e: KeyboardEvent) => setHeld(e.altKey);

  const mouseHandler = (e: MouseEvent) => {
    if (!opts.isEnabled()) return;
    if (!e.altKey) return;
    const path = e.composedPath();
    if (opts.isOurNode(path)) return;

    // Swallow the event so the underlying control never fires (and ⌘-click
    // never opens a link in a new tab while OnboardAI is enabled).
    e.preventDefault();
    e.stopImmediatePropagation();

    if (e.type === 'click' && e.button === 0) {
      // composedPath()[0] pierces open shadow DOM — same node the spotlight
      // rings, so the popup asks about exactly what was highlighted.
      const first = path[0];
      const target =
        first instanceof Element
          ? first
          : e.target instanceof Element
            ? e.target
            : document.documentElement;
      opts.onTrigger({ x: e.clientX, y: e.clientY, target });
    }
  };

  window.addEventListener('click', mouseHandler, { capture: true });
  window.addEventListener('mousedown', mouseHandler, { capture: true });
  window.addEventListener('auxclick', mouseHandler, { capture: true });
  window.addEventListener('keydown', keyHandler, { capture: true });
  window.addEventListener('keyup', keyHandler, { capture: true });
  window.addEventListener('blur', clearHeld);
  document.addEventListener('visibilitychange', clearHeld);

  return { reset: clearHeld };
}
