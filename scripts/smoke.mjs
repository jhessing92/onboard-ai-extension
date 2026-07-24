// Headless smoke test: loads dist/ unpacked into system Chrome and verifies
// the full ⌘-click flow — cursor class on Meta-down, spotlight overlay while
// held (tracks target, pointer-transparent, labeled chip, hides on Meta-up),
// popup opens on ⌘-click, background answers (no_key error bubble when no API
// key is configured), Esc closes. Then a privacy gate: on a local page with a
// pre-filled password, a contenteditable secret, an email in the title and a
// ?token= querystring, the ACTUAL request body (captured by patching fetch in
// the service worker) must contain none of them. Usage: node scripts/smoke.mjs
import puppeteer from 'puppeteer-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';

const dist = resolve('dist');
const profile = mkdtempSync(join(tmpdir(), 'onboardai-'));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// --- local privacy-test page ---------------------------------------------
const PW = 'hunter2-supersecret';
const EDITABLE_SECRET = 'draft-secret-note-do-not-send';
const EMAIL = 'alice@example.com';
const TOKEN = 'tok_LEAK123';
const FRAG = 'frag_LEAK456';
const server = createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(`<!doctype html><html><head><title>Dashboard \u2014 ${EMAIL}</title></head><body>
    <main>
      <h1>Account settings</h1>
      <p>Manage your account credentials below. These settings control how you sign in to the dashboard and keep your workspace secure for every member of the team.</p>
      <form>
        <label for="pw">Password</label>
        <input id="pw" type="password" value="${PW}">
        <input name="user" value="${EMAIL}">
        <button id="savebtn" type="button">Save credentials</button>
      </form>
      <div contenteditable="true">${EDITABLE_SECRET}</div>
      <a href="/next">Continue</a>
    </main>
  </body></html>`);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  // Branded Chrome ignores --load-extension (removed in Chrome 137+); use
  // Chrome for Testing (here: Playwright's cached copy) or any Chromium.
  executablePath:
    process.env.CHROME_BIN ??
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  headless: 'new',
  userDataDir: profile,
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    '--no-first-run',
    '--no-default-browser-check',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://example.com/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800)); // document_idle injection

  // 1. Cursor class while Meta held
  await page.keyboard.down('Meta');
  await new Promise((r) => setTimeout(r, 150));
  const hasCursor = await page.evaluate(() =>
    document.documentElement.classList.contains('__onboardai-cmd')
  );
  check('cursor class on Meta-down', hasCursor);

  // 2. Spotlight while held: hover the link → cutout hugs its rect
  const linkRect = await page.evaluate(() => {
    const r = document.querySelector('a').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, width: r.width, height: r.height };
  });
  await page.mouse.move(linkRect.x, linkRect.y);
  await new Promise((r) => setTimeout(r, 350)); // rAF + 90ms glide
  const spot = await page.evaluate(() => {
    const root = document.querySelector('[data-onboardai-spotlight]')?.shadowRoot;
    const cut = root?.querySelector('.cutout');
    const chip = root?.querySelector('.chip');
    if (!cut) return null;
    const r = cut.getBoundingClientRect();
    return {
      left: r.left, top: r.top, width: r.width, height: r.height,
      backdrop: cut.classList.contains('backdrop'),
      chipText: chip && chip.style.display !== 'none' ? chip.textContent : null,
    };
  });
  const near = (a, b) => Math.abs(a - b) <= 4;
  check(
    'spotlight cutout tracks hovered link rect',
    !!spot && !spot.backdrop &&
      near(spot.left, linkRect.left - 2) && near(spot.top, linkRect.top - 2) &&
      near(spot.width, linkRect.width + 4) && near(spot.height, linkRect.height + 4),
    JSON.stringify(spot)
  );

  // 3. Spotlight layer is pointer-transparent (link still hit-testable)
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.tagName ?? null,
    { x: linkRect.x, y: linkRect.y }
  );
  check('spotlight layer is pointer-transparent', hit === 'A', String(hit));

  // 4. Chip shows the extracted label for the hovered element (link's text)
  const linkText = await page.evaluate(() =>
    (document.querySelector('a').textContent ?? '').replace(/\s+/g, ' ').trim()
  );
  check(
    'spotlight chip shows extracted label',
    !!spot?.chipText && spot.chipText === linkText,
    JSON.stringify({ chip: spot?.chipText, link: linkText })
  );

  // 5. ⌘-click the link → popup, link NOT followed
  const link = await page.$('a');
  await link.click();
  await page.keyboard.up('Meta');
  await new Promise((r) => setTimeout(r, 400));
  check('page not navigated by \u2318-click', page.url() === 'https://example.com/');

  // 6. Spotlight hidden once the modifier is released
  const spotHidden = await page.evaluate(() => {
    const host = document.querySelector('[data-onboardai-spotlight]');
    return !host || host.style.display === 'none';
  });
  check('spotlight hidden on Meta-up', spotHidden);

  const hasPopup = await page.evaluate(() => !!document.querySelector('[data-onboardai]'));
  check('popup host present after \u2318-click', hasPopup);

  const feature = await page.evaluate(
    () => document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('.feature')?.textContent
  );
  check('feature label extracted', !!feature, JSON.stringify(feature));

  // 7. First-ever ⌘-click → consent notice gates the send (CWS User Data
  // policy: prominent disclosure BEFORE any page content is transmitted).
  const consentText = await page.evaluate(
    () => document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('.msg-consent')?.textContent ?? null
  );
  check('consent notice shown on first \u2318-click', /Anthropic/.test(consentText ?? ''), JSON.stringify(consentText?.slice(0, 70)));
  const noSendYet = await page.evaluate(
    () => !document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('.msg-error, .msg-ai, .loader')
  );
  check('nothing sent before consent accepted', noSendYet);
  await page.evaluate(() =>
    document.querySelector('[data-onboardai]').shadowRoot.querySelector('.msg-consent button').click()
  );

  // 8. Background round-trip after consent: no API key on server → error bubble
  await page.waitForFunction(
    () => document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('.msg-error'),
    { timeout: 8000 }
  );
  const errText = await page.evaluate(
    () => document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('.msg-error')?.textContent
  );
  check('error bubble appears (proxy or network)', !!errText, JSON.stringify(errText?.slice(0, 80)));

  // 8. Popup box is on-screen (anchored/clamped)
  const box = await page.evaluate(() => {
    const r = document
      .querySelector('[data-onboardai]')
      ?.shadowRoot?.querySelector('.box')
      ?.getBoundingClientRect();
    return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
  });
  check(
    'popup clamped inside viewport',
    !!box && box.left >= 0 && box.top >= 0 && box.right <= 1280 && box.bottom <= 800,
    JSON.stringify(box)
  );

  // 9. Esc closes
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 200));
  const closed = await page.evaluate(() => !document.querySelector('[data-onboardai]'));
  check('Esc closes popup', closed);

  // 10. Meta released → cursor class gone
  const cursorGone = await page.evaluate(
    () => !document.documentElement.classList.contains('__onboardai-cmd')
  );
  check('cursor class cleared on Meta-up', cursorGone);

  // 11. Plain click unaffected (navigates)
  await page.click('a');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  check('plain click still navigates', page.url() !== 'https://example.com/', page.url());

  // --- privacy gate ------------------------------------------------------
  // Capture the outgoing body by patching fetch inside the service worker —
  // this asserts at the real network boundary, not on internals.
  const extTarget = await browser.waitForTarget(
    (t) => t.url().startsWith('chrome-extension://'),
    { timeout: 10000 }
  );
  const extId = new URL(extTarget.url()).host;
  const opts = await browser.newPage();
  await opts.goto(`chrome-extension://${extId}/options.html`);
  await opts.evaluate(() =>
    chrome.storage.local.set({ enabled: true })
  );
  await opts.close();

  const swTarget = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().startsWith(`chrome-extension://${extId}`),
    { timeout: 10000 }
  );
  const sw = await swTarget.worker();
  await sw.evaluate(() => {
    self.__bodies = [];
    const orig = self.fetch.bind(self);
    self.fetch = (input, init) => {
      if (init && typeof init.body === 'string') self.__bodies.push(init.body);
      return orig(input, init);
    };
  });

  const priv = await browser.newPage();
  await priv.setViewport({ width: 1280, height: 800 });
  await priv.goto(`http://127.0.0.1:${port}/settings?token=${TOKEN}&session=abc#access_token=${FRAG}`, {
    waitUntil: 'networkidle2',
  });
  await new Promise((r) => setTimeout(r, 800));
  // ⌘-click the password field itself — worst case for extraction.
  const pwPoint = await priv.evaluate(() => {
    const r = document.getElementById('pw').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await priv.keyboard.down('Meta');
  await priv.mouse.click(pwPoint.x, pwPoint.y);
  await priv.keyboard.up('Meta');

  let bodies = [];
  for (let i = 0; i < 30 && bodies.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 300));
    bodies = await sw.evaluate(() => self.__bodies ?? []);
  }
  check('privacy: request captured at network boundary', bodies.length > 0, `${bodies.length} bodies`);
  const consentOnce = await priv.evaluate(
    () => !document.querySelector('[data-onboardai]')?.shadowRoot?.querySelector('.msg-consent')
  );
  check('consent shown only once (ack persisted in storage)', consentOnce);
  const body = bodies.join('\n');
  check('privacy: pre-filled password NOT in request', !body.includes(PW));
  check('privacy: URL token/query string NOT in request', !body.includes(TOKEN) && !body.includes('session=abc') && !body.includes(FRAG));
  check('privacy: contenteditable text NOT in request', !body.includes(EDITABLE_SECRET));
  check('privacy: email scrubbed from page title', !body.includes(EMAIL));
  check(
    'privacy: sanity — path + label DID travel',
    body.includes('/settings') && /input field/.test(body),
    body.length ? `body ${body.length} chars` : ''
  );
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? '\nALL PASS' : `\n${failed.length} FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
