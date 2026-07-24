// Options page (also the toolbar action popup). Loads current settings,
// saves on click; the enable toggle applies live (content scripts listen via
// chrome.storage.onChanged).
import { MODEL_OPTIONS, DEFAULT_MODEL } from '../shared/models';
import { getSettings, saveSettings } from '../shared/settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const modelEl = $<HTMLSelectElement>('model');
const enabledEl = $<HTMLInputElement>('enabled');
const saveEl = $<HTMLButtonElement>('save');
const statusEl = $<HTMLParagraphElement>('status');

for (const m of MODEL_OPTIONS) {
  const opt = document.createElement('option');
  opt.value = m.id;
  opt.textContent = m.label;
  modelEl.appendChild(opt);
}

let statusTimer: ReturnType<typeof setTimeout> | undefined;
function setStatus(text: string, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('err', isError);
  clearTimeout(statusTimer);
  if (text) statusTimer = setTimeout(() => (statusEl.textContent = ''), 2500);
}

async function load() {
  const s = await getSettings();
  modelEl.value = s.model || DEFAULT_MODEL;
  enabledEl.checked = s.enabled;
}

async function save() {
  await saveSettings({ model: modelEl.value, enabled: enabledEl.checked });
  setStatus('Saved ✓');
}

saveEl.addEventListener('click', () => void save());
// The enable toggle is the escape hatch — apply it immediately, no Save needed.
enabledEl.addEventListener('change', () => {
  void saveSettings({ enabled: enabledEl.checked });
  setStatus(enabledEl.checked ? 'Enabled' : 'Disabled — native \u2318-click restored');
});

void load();

// Uninstall button — removes the extension from Chrome
const uninstallEl = $<HTMLButtonElement>('uninstall');
uninstallEl.addEventListener('click', () => {
  if (confirm('Remove OnboardAI from Chrome?\n\nYou can always reinstall it later from the Shoofly website.')) {
    chrome.management.uninstallSelf({ showConfirmDialog: false });
  }
});
