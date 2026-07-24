// Audits the landing-page install wizard: serves landing/ locally, then
// asserts one-step-at-a-time visibility, Back/Next flow + contextual labels,
// the chrome://extensions copy pill (real clipboard write), mac/win OS
// variants, #step-N deep links, localStorage resume, and the zip download
// link — at 1440 and 390 widths. Usage: node scripts/audit-wizard.mjs
import puppeteer from 'puppeteer-core';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname, normalize } from 'node:path';
import { createServer } from 'node:http';

const landing = resolve('landing');
const profile = mkdtempSync(join(tmpdir(), 'onboardai-wiz-'));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const MIME = { '.html': 'text/html', '.png': 'image/png', '.zip': 'application/zip', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = join(landing, path === '/' ? 'index.html' : path);
  if (!file.startsWith(landing) || !existsSync(file)) {
    res.statusCode = 404;
    return res.end('not found');
  }
  res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_BIN ??
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  headless: 'new',
  userDataDir: profile,
  args: ['--no-first-run', '--no-default-browser-check'],
});
await browser.defaultBrowserContext().overridePermissions(base, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);

const visibleSteps = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.wstep'))
      .filter((s) => !s.hidden)
      .map((s) => s.dataset.step)
  );

try {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    await page.goto(`${base}/`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });

    // zip link present (hero CTA + step-1 button)
    const zipLinks = await page.evaluate(
      () => document.querySelectorAll('a[href="onboardai.zip"][download]').length
    );
    check(`[${w}] zip download links present`, zipLinks >= 2, `${zipLinks} links`);

    // Walk forward through all 7 steps + done, one visible at a time
    let walkOk = true;
    const labels = [];
    for (let i = 1; i <= 7; i++) {
      const vis = await visibleSteps(page);
      if (vis.length !== 1 || vis[0] !== String(i)) {
        walkOk = false;
        check(`[${w}] step ${i} visible alone`, false, JSON.stringify(vis));
        break;
      }
      labels.push(await page.evaluate(() => document.getElementById('wiz-next').textContent));
      await page.click('#wiz-next');
    }
    check(`[${w}] forward walk: one step at a time, 1→7`, walkOk);
    check(`[${w}] contextual Next labels (all distinct)`, new Set(labels).size === 7, labels.join(' | '));
    const doneVis = await visibleSteps(page);
    check(`[${w}] done panel after step 7`, doneVis.length === 1 && doneVis[0] === '8', JSON.stringify(doneVis));
    const nextHidden = await page.evaluate(() => document.getElementById('wiz-next').hidden);
    check(`[${w}] Next hidden on done panel`, nextHidden);

    // Back from done → step 7
    await page.click('#wiz-back');
    check(`[${w}] Back returns to step 7`, (await visibleSteps(page))[0] === '7');

    // Skip button only on step 6
    await page.evaluate(() => document.querySelectorAll('#wiz-dots .dot')[5].click());
    const skipOn6 = await page.evaluate(() => !document.getElementById('wiz-skip').hidden);
    await page.evaluate(() => document.querySelectorAll('#wiz-dots .dot')[0].click());
    const skipOn1 = await page.evaluate(() => document.getElementById('wiz-skip').hidden);
    check(`[${w}] skip visible on 6 only`, skipOn6 && skipOn1);

    // Copy pill writes chrome://extensions to the real clipboard
    await page.evaluate(() => document.querySelectorAll('#wiz-dots .dot')[2].click());
    await page.click('#copy-btn');
    await new Promise((r) => setTimeout(r, 300));
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check(`[${w}] copy button writes chrome://extensions`, clip === 'chrome://extensions', JSON.stringify(clip));
    const copiedLabel = await page.evaluate(() => document.getElementById('copy-btn').textContent);
    check(`[${w}] copy button confirms`, /Copied/.test(copiedLabel), copiedLabel);

    // Hash deep link
    await page.goto(`${base}/#step-5`, { waitUntil: 'networkidle0' });
    check(`[${w}] #step-5 deep link`, (await visibleSteps(page))[0] === '5');

    // localStorage resume (no hash)
    await page.evaluate(() => localStorage.setItem('obw', '4'));
    await page.goto(`${base}/`, { waitUntil: 'networkidle0' });
    check(`[${w}] resume from localStorage`, (await visibleSteps(page))[0] === '4');

    // Screenshots of a representative step
    await page.goto(`${base}/#step-4`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.getElementById('wizard').scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: `wizard-audit-${w}.png` });

    await page.close();
  }

  // OS variants via UA override
  for (const [os, ua, expectMac] of [
    ['mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', true],
    ['win', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', false],
  ]) {
    const page = await browser.newPage();
    await page.setUserAgent(ua);
    await page.goto(`${base}/#step-2`, { waitUntil: 'networkidle0' });
    const state = await page.evaluate(() => {
      const vis = (el) => !!el && getComputedStyle(el).display !== 'none';
      const step2 = document.querySelector('.wstep[data-step="2"]');
      return {
        dataOs: document.documentElement.dataset.os,
        macCopy: vis(step2.querySelector('.os-mac')),
        winCopy: vis(step2.querySelector('.os-win')),
        winCallout: vis(step2.querySelector('.callout.os-win')),
      };
    });
    check(
      `[os] ${os} UA → ${os} wording`,
      state.dataOs === os && state.macCopy === expectMac && state.winCopy === !expectMac && state.winCallout === !expectMac,
      JSON.stringify(state)
    );
    await page.close();
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? '\nALL PASS' : `\n${failed.length} FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
