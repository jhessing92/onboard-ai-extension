// Content-script wiring: trigger → extract → popup + chat session.
// Each ⌘-click is a fresh popup and a fresh session; the first answer comes
// from a hidden seed message. Outside mousedown and Esc close the popup.
import { initTrigger, type TriggerEvent } from './trigger';
import { resolveTarget, extractContext } from './extract';
import { Popup } from './popup';
import { ChatSession } from './chat';
import { Spotlight } from './spotlight';
import { getSettings, onSettingsChanged } from '../shared/settings';
import type { ChatErrorCode } from '../shared/messages';

let enabled = true; // assume on until settings load; trigger re-checks live
let consentAck = false; // one-time "sends page text to Anthropic" notice
let popup: Popup | null = null;
let session: ChatSession | null = null;
let spotlight: Spotlight | null = null; // lazy-created on first modifier hold

function closePopup(): void {
  session?.abort();
  session = null;
  popup?.destroy();
  popup = null;
}

function errorText(code: ChatErrorCode, message: string): { text: string; setup: boolean } {
  switch (code) {
    case 'no_key':
      return {
        text: 'OnboardAI needs an Anthropic API key to answer. Add one in settings \u2014 it stays on this device.',
        setup: true,
      };
    case 'auth':
      return { text: `The API rejected your key: ${message}`, setup: true };
    case 'network':
      return { text: message, setup: false };
    case 'api':
      return { text: `Something went wrong: ${message}`, setup: false };
  }
}

function runSend(text: string, hidden: boolean): void {
  if (!popup || !session || session.busy) return;
  const p = popup;
  if (!hidden) p.addUser(text);
  p.startAssistant();
  session.send(text, {
    onDelta: (t) => {
      if (popup === p) p.appendDelta(t);
    },
    onDone: () => {
      if (popup === p) p.finishAssistant();
    },
    onError: (code, message) => {
      if (popup !== p) return;
      p.finishAssistant();
      const { text: msg, setup } = errorText(code, message);
      p.showError(msg, setup);
    },
  });
}

function openFor(t: TriggerEvent): void {
  closePopup();
  // resolveTarget returns the element the label came from (e.g. the button a
  // clicked span sits in) — context and spotlight reference the same node.
  const { el: resolved, label: feature } = resolveTarget(t.target);
  const context = extractContext(resolved, feature);
  session = new ChatSession(context);
  popup = new Popup(t.x, t.y, feature, {
    onSend: (text) => runSend(text, false),
    onClose: closePopup,
    onOpenOptions: () => void chrome.runtime.sendMessage({ type: 'open-options' }),
  });
  // Hidden seed — the streamed answer becomes bubble #1. On the very first
  // ⌘-click ever, a consent bubble gates the send (nothing leaves the page
  // until "Got it"); the ack is persisted in chrome.storage.local.
  const p = popup;
  const seed = `Explain the "${feature}" element on this page \u2014 what it is, what it does, and why it matters.`;
  if (consentAck) {
    runSend(seed, true);
  } else {
    p.showConsent(() => {
      if (popup !== p) return;
      consentAck = true;
      void chrome.storage.local.set({ consentAck: true });
      runSend(seed, true);
    });
  }
}

const trigger = initTrigger({
  isEnabled: () => enabled,
  isOurNode: (path) => (popup ? popup.containsPath(path) : false),
  onTrigger: openFor,
  // Spotlight lifetime == modifier held (blur/⌘-Tab auto-emit false).
  onModifier: (held) => {
    if (held) {
      spotlight ??= new Spotlight();
      spotlight.show();
    } else {
      spotlight?.hide();
    }
  },
});

// Outside mousedown closes (⌘-held mousedown is swallowed by the trigger and
// the follow-up ⌘-click re-anchors a fresh popup instead).
window.addEventListener(
  'mousedown',
  (e) => {
    if (!popup) return;
    if (e.metaKey || e.ctrlKey) return;
    if (popup.containsPath(e.composedPath())) return;
    closePopup();
  },
  { capture: true }
);

// Esc closes from anywhere on the page.
window.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape' && popup) closePopup();
  },
  { capture: true }
);

void getSettings().then((s) => {
  enabled = s.enabled;
});
void chrome.storage.local.get('consentAck').then((r) => {
  consentAck = r.consentAck === true;
});

// Live toggle from the options page — the escape hatch that instantly
// restores native ⌘-click behavior.
onSettingsChanged((patch) => {
  if (patch.enabled !== undefined) {
    enabled = patch.enabled;
    if (!enabled) {
      trigger.reset();
      closePopup();
      spotlight?.destroy();
      spotlight = null;
    }
  }
});
