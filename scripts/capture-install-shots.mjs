// Captures REAL chrome://extensions + options-page screenshots for the
// landing-page install wizard, using the same Chrome-for-Testing recipe as
// smoke.mjs / live-test.mjs. Output → landing/shots/.
//
//   node scripts/capture-install-shots.mjs
//
// Shots:
//   ext-devmode-off.png   chrome://extensions, Developer mode OFF (toggle visible, top-right)
//   ext-devmode-on.png    same page after flipping the toggle — Load-unpacked toolbar revealed
//   ext-toolbar-on.png    tight crop of the revealed toolbar (Load unpacked / Pack / Update)
//   ext-card.png          the loaded "OnboardAI by Shoofly" extension card
//   options-blank.png     the options page with an empty API-key field
import puppeteer from 'puppeteer-core';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dist = resolve('dist');
const outDir = resolve('landing/shots');
mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'onboardai-shots-'));

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_BIN ??
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  headless: 'new',
  userDataDir: profile,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--no-first-run', '--no-default-browser-check'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto('chrome://extensions', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  // Shadow-DOM helpers for the extensions page (extensions-manager tree).
  const toolbarHandle = async () =>
    page.evaluateHandle(() =>
      document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-toolbar')
    );

  const devModeOn = () =>
    page.evaluate(
      () =>
        document
          .querySelector('extensions-manager')
          .shadowRoot.querySelector('extensions-toolbar')
          .shadowRoot.querySelector('#devMode').checked
    );

  // Ensure the toggle starts OFF (fresh profile default), capture OFF state.
  if (await devModeOn()) {
    await page.evaluate(() =>
      document
        .querySelector('extensions-manager')
        .shadowRoot.querySelector('extensions-toolbar')
        .shadowRoot.querySelector('#devMode')
        .click()
    );
    await new Promise((r) => setTimeout(r, 400));
  }
  await page.screenshot({ path: join(outDir, 'ext-devmode-off.png') });
  console.log('shot: ext-devmode-off.png');
  // Header-only crop (search bar + Developer-mode toggle) — the wizard points
  // a pulsing ring at the toggle, so keep the crop tight.
  await page.screenshot({
    path: join(outDir, 'ext-devmode-off-top.png'),
    clip: { x: 0, y: 0, width: 1280, height: 62 },
  });
  console.log('shot: ext-devmode-off-top.png');

  // Flip Developer mode ON via the shadow DOM and capture the revealed toolbar.
  await page.evaluate(() =>
    document
      .querySelector('extensions-manager')
      .shadowRoot.querySelector('extensions-toolbar')
      .shadowRoot.querySelector('#devMode')
      .click()
  );
  await new Promise((r) => setTimeout(r, 600));
  if (!(await devModeOn())) throw new Error('developer-mode toggle did not flip on');
  await page.screenshot({ path: join(outDir, 'ext-devmode-on.png') });
  console.log('shot: ext-devmode-on.png');

  // Tight crop of the toolbar (shows Load unpacked / Pack / Update + toggle).
  const tb = await toolbarHandle();
  const tbBox = await tb.asElement().boundingBox();
  await page.screenshot({
    path: join(outDir, 'ext-toolbar-on.png'),
    clip: { x: tbBox.x, y: tbBox.y, width: tbBox.width, height: tbBox.height },
  });
  console.log('shot: ext-toolbar-on.png');

  // The loaded extension card ("OnboardAI by Shoofly").
  const card = await page.evaluateHandle(() => {
    const mgr = document.querySelector('extensions-manager').shadowRoot;
    const list = mgr.querySelector('extensions-item-list').shadowRoot;
    return list.querySelector('extensions-item');
  });
  const cardName = await page.evaluate((c) => c.shadowRoot.querySelector('#name').textContent.trim(), card);
  if (!/OnboardAI/.test(cardName)) throw new Error(`unexpected extension card: ${cardName}`);
  const cardBox = await card.asElement().boundingBox();
  const pad = 8;
  await page.screenshot({
    path: join(outDir, 'ext-card.png'),
    clip: { x: cardBox.x - pad, y: cardBox.y - pad, width: cardBox.width + pad * 2, height: cardBox.height + pad * 2 },
  });
  console.log(`shot: ext-card.png (${cardName})`);

  // Options page with a blank key field (popup-sized viewport).
  const extTarget = await browser.waitForTarget((t) => t.url().startsWith('chrome-extension://'), { timeout: 10000 });
  const extId = new URL(extTarget.url()).host;
  const opts = await browser.newPage();
  await opts.setViewport({ width: 380, height: 560, deviceScaleFactor: 2 });
  await opts.goto(`chrome-extension://${extId}/options.html`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 400));
  await opts.screenshot({ path: join(outDir, 'options-blank.png') });
  console.log('shot: options-blank.png');

  console.log('\nALL SHOTS CAPTURED →', outDir);
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
