// Background service worker: relays chat requests from content scripts to the
// Anthropic Messages API (streaming SSE) and streams text deltas back over the
// Port. The API key never enters page context, and host_permissions exempts
// the request from CORS/page CSP.
import { CHAT_PORT_NAME, type ChatRequest, type ChatResponse, type OneShotMessage } from './shared/messages';
import { getSettings } from './shared/settings';
import { MAX_TOKENS } from './shared/models';

const API_URL = 'https://onboardai-shoofly.netlify.app/.netlify/functions/anthropic';

const SYSTEM_PROMPT = `You are OnboardAI, Shoofly's on-page guide — a browser extension that acts as an instant onboarding guide for any website. The user held \u2318/Ctrl and clicked an element on the page they are viewing to ask what it is — the clicked element and page details are given in PAGE CONTEXT below.

RULES:
- Start by explaining THAT element: what it does, who it's for, and why it matters — plain language, no jargon.
- Ground your answer in the PAGE CONTEXT. You may combine it with general knowledge of well-known sites (e.g. what "Fork" means on GitHub), but NEVER invent site-specific features. If you aren't sure what something does, say so plainly.
- You are an explainer, NOT an operator. You cannot click, submit, navigate, or change anything — and you must never claim to. If asked to do something, explain HOW the user would do it instead.
- Answer follow-ups (including "what would happen if…") the same way: short and grounded.
- Keep every reply SHORT — it renders in a small popup: 2-4 sentences or up to 4 tight bullets. Light markdown only (bold, bullets). No headings, no code blocks unless the user asks about code.`;

function post(port: chrome.runtime.Port, msg: ChatResponse): boolean {
  try {
    port.postMessage(msg);
    return true;
  } catch {
    return false; // port already disconnected
  }
}

async function handleChat(port: chrome.runtime.Port, req: ChatRequest, signal: AbortSignal): Promise<void> {
  const settings = await getSettings();

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: `${SYSTEM_PROMPT}\n\nPAGE CONTEXT:\n${req.context}`,
        messages: req.messages.slice(-12),
      }),
    });
  } catch (err) {
    if (signal.aborted) return;
    post(port, { type: 'error', code: 'network', message: `Could not reach the Anthropic API (${(err as Error).message}). Check your connection.` });
    return;
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body?.error?.message ?? '';
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 || res.status === 403) {
      post(port, { type: 'error', code: 'auth', message: detail || 'Your API key was rejected. Check it in OnboardAI settings.' });
    } else {
      post(port, { type: 'error', code: 'api', message: detail || `Anthropic API error (HTTP ${res.status}).` });
    }
    return;
  }

  if (!res.body) {
    post(port, { type: 'error', code: 'api', message: 'Empty response from the Anthropic API.' });
    return;
  }

  // Hand-rolled SSE parse: we only need `data:` lines carrying JSON events.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).replace(/\r$/, '');
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let ev: {
          type?: string;
          delta?: { type?: string; text?: string };
          error?: { message?: string };
        };
        try {
          ev = JSON.parse(data);
        } catch {
          continue; // partial/garbled frame
        }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
          if (!post(port, { type: 'delta', text: ev.delta.text })) return;
        } else if (ev.type === 'error') {
          post(port, { type: 'error', code: 'api', message: ev.error?.message ?? 'Stream error.' });
          return;
        }
      }
    }
  } catch (err) {
    if (!signal.aborted) {
      post(port, { type: 'error', code: 'network', message: `Stream interrupted (${(err as Error).message}).` });
    }
    return;
  }
  post(port, { type: 'done' });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== CHAT_PORT_NAME) return;
  const controller = new AbortController();
  port.onDisconnect.addListener(() => controller.abort());
  port.onMessage.addListener((msg: ChatRequest) => {
    if (msg?.type === 'chat') {
      void handleChat(port, msg, controller.signal);
    }
  });
});

chrome.runtime.onMessage.addListener((msg: OneShotMessage) => {
  if (msg?.type === 'open-options') {
    void chrome.runtime.openOptionsPage();
  }
});
