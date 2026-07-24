# OnboardAI by Shoofly

Chrome extension (Manifest V3): hold ⌘ (Ctrl on Windows) and the page dims with
a spotlight following your cursor; click any element to get a streamed Claude
explanation of what it is and what it does, anchored right where you clicked.

Privacy stance: **provably unable to read what you type** — see [PRIVACY.md](PRIVACY.md).

## Develop

```sh
npm install
npm run typecheck
node build.mjs            # bundles src/ → dist/ (add --watch to iterate)
node scripts/make-icons.mjs  # regenerate icons + ⌘ cursor
```

Load `dist/` via `chrome://extensions` → Developer mode → Load unpacked.

## Test

```sh
node scripts/smoke.mjs    # headless: trigger, spotlight, popup, privacy gate
ONBOARDAI_KEY=sk-ant-… node scripts/live-test.mjs <url> <targetText> [followUp]
```

The smoke suite includes a network-boundary privacy gate: it ⌘-clicks a local
page seeded with a pre-filled password, a contenteditable draft, an email in
the title, and `?token=…` in the URL, captures the actual outgoing request
body, and fails if any of them appear.

## Distribution

- **Beta (current):** the landing page at https://onboardai-shoofly.netlify.app
  walks users through load-unpacked with an interactive 7-step wizard (real
  screenshots, copy-to-clipboard, OS-aware wording, localStorage resume).
- **Production path:** unlisted Chrome Web Store listing (`store/SUBMIT.md` has
  the click-by-click walkthrough; listing text and permission justifications
  are in `store/LISTING.md` and `store/JUSTIFICATIONS.md`). When approved, set
  `CWS_URL` in `landing/index.html` and redeploy — the wizard collapses into a
  fallback and the hero CTA becomes "Add to Chrome."

## Landing page

`landing/` is a self-contained static site (Shoofly brand). Rebuild the zip
after any `dist/` change, then deploy from inside `landing/`:

```sh
rm -rf /tmp/onboardai && cp -r dist /tmp/onboardai && (cd /tmp && zip -qr onboardai.zip onboardai) && mv /tmp/onboardai.zip landing/onboardai.zip
cd landing && npx netlify deploy --prod --dir=. --no-build
```

Related scripts:

- `scripts/capture-install-shots.mjs` — regenerate `landing/shots/` (requires Chrome for Testing)
- `scripts/audit-wizard.mjs` — headless audit of wizard flow at 1440 & 390
- `scripts/make-promo-tile.mjs` — regenerate the 440×280 CWS promo tile
