// Settings live in chrome.storage.local (NOT sync — the API key stays on this
// machine). Missing keys fall back to defaults; `enabled` defaults to true.
import { DEFAULT_MODEL } from './models';

export interface Settings {
  model: string;
  enabled: boolean;
}

const KEYS = ['model', 'enabled'] as const;

export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.local.get(KEYS as unknown as string[]);
  return {
    model: typeof raw.model === 'string' && raw.model ? raw.model : DEFAULT_MODEL,
    enabled: raw.enabled !== false,
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}

/** Fires with a partial patch whenever any setting changes (any context). */
export function onSettingsChanged(cb: (patch: Partial<Settings>) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const patch: Record<string, unknown> = {};
    for (const k of KEYS) {
      if (k in changes) patch[k] = changes[k].newValue;
    }
    if (Object.keys(patch).length > 0) cb(patch as Partial<Settings>);
  });
}
