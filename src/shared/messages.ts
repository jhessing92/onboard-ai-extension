// Port protocol between the content script and the background service worker.
// One Port per chat request: content posts a single `chat` message, background
// streams `delta`s and terminates with `done` or `error`. Disconnecting the
// port mid-stream aborts the upstream Anthropic request.

export const CHAT_PORT_NAME = 'onboardai-chat';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  type: 'chat';
  /** Full visible+seed history, already capped by the sender (≤12 turns). */
  messages: ChatTurn[];
  /** Serialized page-context block, appended to the system prompt. */
  context: string;
}

export type ChatErrorCode = 'no_key' | 'auth' | 'network' | 'api';

export type ChatResponse =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; code: ChatErrorCode; message: string };

/** One-shot runtime messages (not on the chat port). */
export type OneShotMessage = { type: 'open-options' };
