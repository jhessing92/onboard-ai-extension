// Model options offered on the options page.
export interface ModelOption {
  id: string;
  label: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — fast (recommended)' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 — smarter, slower' },
];

export const DEFAULT_MODEL = 'claude-haiku-4-5';
export const MAX_TOKENS = 1024;
