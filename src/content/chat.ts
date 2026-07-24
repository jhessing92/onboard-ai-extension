// Chat session: holds the transcript (including the hidden seed message) and
// talks to the background worker over a fresh Port per request.
import {
  CHAT_PORT_NAME,
  type ChatErrorCode,
  type ChatResponse,
  type ChatTurn,
} from '../shared/messages';

export interface ChatEvents {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (code: ChatErrorCode, message: string) => void;
}

export class ChatSession {
  private readonly context: string;
  private readonly history: ChatTurn[] = [];
  private port: chrome.runtime.Port | null = null;
  private active = false;

  constructor(context: string) {
    this.context = context;
  }

  get busy(): boolean {
    return this.active;
  }

  send(text: string, ev: ChatEvents): void {
    if (this.active) return;
    this.history.push({ role: 'user', content: text });
    this.active = true;

    let assistant = '';
    let finished = false;
    const finish = (port: chrome.runtime.Port) => {
      finished = true;
      this.active = false;
      if (this.port === port) this.port = null;
      try {
        port.disconnect();
      } catch {
        /* already gone */
      }
    };

    let port: chrome.runtime.Port;
    try {
      port = chrome.runtime.connect({ name: CHAT_PORT_NAME });
    } catch {
      // Extension was reloaded/removed since this content script loaded.
      this.active = false;
      ev.onError('network', 'OnboardAI was updated \u2014 reload this page to keep using it.');
      return;
    }
    this.port = port;

    port.onMessage.addListener((msg: ChatResponse) => {
      if (msg.type === 'delta') {
        assistant += msg.text;
        ev.onDelta(msg.text);
      } else if (msg.type === 'done') {
        this.history.push({ role: 'assistant', content: assistant || '(no answer)' });
        finish(port);
        ev.onDone();
      } else {
        finish(port);
        ev.onError(msg.code, msg.message);
      }
    });

    port.onDisconnect.addListener(() => {
      if (!finished) {
        finished = true;
        this.active = false;
        if (this.port === port) this.port = null;
        ev.onError('network', 'Lost connection to the extension mid-answer. Try again.');
      }
    });

    port.postMessage({
      type: 'chat',
      messages: this.history.slice(-12),
      context: this.context,
    });
  }

  /** Disconnecting the port makes the background abort the upstream request. */
  abort(): void {
    const port = this.port;
    this.port = null;
    this.active = false;
    try {
      port?.disconnect();
    } catch {
      /* already gone */
    }
  }
}
