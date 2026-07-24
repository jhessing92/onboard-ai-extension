// Live E2E harness: loads dist/ into Chrome for Testing, then ⌘-clicks a
// target element on a real site and verifies a streamed answer + follow-up.
// The extension calls the Shoofly proxy (Netlify function) which provides the
// API key server-side — no local key needed.
// Usage: node scripts/live-test.mjs <url> <targetText> [followUp]
import puppeteer from 'puppeteer-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [url, targetText, followUp] = process.argv.slice(2);
if (!url || !targetText) {
  console.error('Usage: node scripts/live-test.mjs <url> <targetText> [followUp]');
  process.exit(2);
}

const dist = resolve('dist');
const profile = mkdtempSync(join(tmpdir(), 'onboardai-live-'));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_BIN ??
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  headless: 'new',
  userDataDir: profile,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--no-first-run'],
});

const fail = async (msg) => {
  console.error(`FAIL — ${msg}`);
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
  process.exit(1);
};

try {
  // Find our extension id from any chrome-extension:// target
  let extTarget;
  for (let i = 0; i < 20 && !extTarget; i++) {
    extTarget = browser.targets().find((t) => t.url().startsWith('chrome-extension://'));
    if (!extTarget) await new Promise((r) => setTimeout(r, 250));
  }
  if (!extTarget) await fail('extension target never appeared');
  const extId = new URL(extTarget.url()).host;
  console.log(`extension loaded: ${extId}`);

  // Seed settings (extension uses server-side API key via proxy)
  const opts = await browser.newPage();
  await opts.goto(`chrome-extension://${extId}/options.html`);
  await opts.evaluate(() =>
    chrome.storage.local.set({ model: 'claude-haiku-4-5', enabled: true, consentAck: true })
  );
  console.log('settings seeded');
  await opts.close();

  // Target page
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1200));

  // Locate a visible element whose text matches targetText
  const point = await page.evaluate((needle) => {
    const walk = document.querySelectorAll('a, button, [role="button"], summary, span');
    for (const el of walk) {
      const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (t.toLowerCase() === needle.toLowerCase() || t.toLowerCase().startsWith(needle.toLowerCase() + ' ')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight) {
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: el.tagName, text: t.slice(0, 60) };
        }
      }
    }
    return null;
  }, targetText);
  if (!point) await fail(`no visible element matching ${JSON.stringify(targetText)}`);
  console.log(`clicking <${point.tag.toLowerCase()}> "${point.text}" at (${Math.round(point.x)}, ${Math.round(point.y)})`);

  const urlBefore = page.url();
  await page.keyboard.down('Meta');
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up('Meta');
  await new Promise((r) => setTimeout(r, 500));
  if (page.url() !== urlBefore) await fail('page navigated — \u2318-click was not intercepted');

  const $popup = () => document.querySelector('[data-onboardai]')?.shadowRoot ?? null;
  const feature = await page.evaluate(() =>
    document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('.feature')?.textContent
  );
  if (!feature) await fail('popup did not open');
  console.log(`feature label: ${JSON.stringify(feature)}`);

  // Wait for the streamed answer to finish (popup drops aria-busy on done)
  const readAnswer = () =>
    page.evaluate(() => {
      const root = document.querySelector('[data-onboardai]')?.shadowRoot;
      const err = root?.querySelector('.msg-error')?.textContent;
      const bubbles = root ? Array.from(root.querySelectorAll('.msg-ai')).map((b) => b.textContent ?? '') : [];
      const busy = !!root?.querySelector('.box[aria-busy]');
      return { err: err ?? null, answers: bubbles, busy };
    });
  const waitDone = async (label) => {
    const deadline = Date.now() + 60000;
    for (;;) {
      const { err, answers, busy } = await readAnswer();
      if (err) await fail(`${label} error bubble: ${err}`);
      if (!busy && answers.join('').length > 0) return answers;
      if (Date.now() > deadline) await fail(`${label} never finished streaming`);
      await new Promise((r) => setTimeout(r, 300));
    }
  };
  const answers1 = await waitDone('answer #1');
  console.log(`\n=== ANSWER #1 ===\n${answers1.join('\n---\n')}\n`);

  const shotBase = new URL(url).hostname.replace(/\W+/g, '-');
  await page.screenshot({ path: `${shotBase}-live-test.png` });

  if (followUp) {
    await page.evaluate(() =>
      document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('input')?.focus()
    );
    await page.keyboard.type(followUp);
    await page.keyboard.press('Enter');
    const answersBefore = answers1.length;
    await new Promise((r) => setTimeout(r, 500)); // let aria-busy flip on
    const all = await waitDone('follow-up');
    const followAnswer = all.slice(answersBefore).join('');
    if (!followAnswer) await fail('follow-up produced no new bubble');
    console.log(`=== FOLLOW-UP ANSWER ===\n${followAnswer}\n`);
    await page.screenshot({ path: `${shotBase}-live-test-followup.png` });
  }

  const cspErrors = consoleErrors.filter((e) => /content security policy|csp/i.test(e));
  console.log(`console errors: ${consoleErrors.length} total, ${cspErrors.length} CSP-related`);
  if (cspErrors.length > 0) console.log(cspErrors.join('\n'));
  console.log('\nALL PASS');
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
