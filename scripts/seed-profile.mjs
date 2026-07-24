// Pre-seed a persistent Chrome profile with the OnboardAI API key so a
// separate (MCP-driven) browser can reuse it. Key comes from $ONBOARDAI_KEY
// and is written straight into chrome.storage.local — never printed.
// Usage: ONBOARDAI_KEY=… node scripts/seed-profile.mjs /tmp/onboardai-profile
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';

const [profileDir] = process.argv.slice(2);
const key = process.env.ONBOARDAI_KEY;
if (!key || !profileDir) {
  console.error('Usage: ONBOARDAI_KEY=… node scripts/seed-profile.mjs <profileDir>');
  process.exit(2);
}

const dist = resolve('dist');
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_BIN ??
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  headless: 'new',
  userDataDir: profileDir,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--no-first-run'],
});

try {
  let extTarget;
  for (let i = 0; i < 20 && !extTarget; i++) {
    extTarget = browser.targets().find((t) => t.url().startsWith('chrome-extension://'));
    if (!extTarget) await new Promise((r) => setTimeout(r, 250));
  }
  if (!extTarget) throw new Error('extension target never appeared');
  const extId = new URL(extTarget.url()).host;
  console.log(`extension id: ${extId}`);

  const opts = await browser.newPage();
  await opts.goto(`chrome-extension://${extId}/options.html`);
  await opts.evaluate(
    (k) => chrome.storage.local.set({ apiKey: k, model: 'claude-haiku-4-5', enabled: true }),
    key
  );
  const seeded = await opts.evaluate(async () => {
    const s = await chrome.storage.local.get('apiKey');
    return typeof s.apiKey === 'string' && s.apiKey.startsWith('sk-ant-');
  });
  console.log(`api key seeded: ${seeded}`);
  if (!seeded) process.exit(1);
} finally {
  await browser.close();
}
console.log('profile ready');
