# Chrome Web Store Submission Walkthrough

Step-by-step for the developer (Jonathan) to submit OnboardAI as an **Unlisted** extension.

---

## Prerequisites

1. **Google account** — any personal or Workspace account works.
2. **One-time $5 registration fee** (card or Google Pay).
3. **Anthropic API key** seeded in the extension for the review screenshots (reviewer may test functionality).

---

## Steps

### 1. Register as a Chrome Web Store Developer

1. Go to https://chrome.google.com/webstore/devconsole
2. Accept the Developer Agreement.
3. Pay the $5 registration fee.
4. Fill in developer display name ("Shoofly") and email.

### 2. Create a New Item

1. Click **New Item**.
2. Upload the **zip file**: `landing/onboardai.zip` (the same file users download).
3. Wait for the package to validate (checks manifest, icons, CSP).

### 3. Fill in Store Listing

Use the text from `store/LISTING.md`:

| Field | Source |
|-------|--------|
| Name | `OnboardAI by Shoofly` |
| Summary | 132-char summary |
| Description | Full description block |
| Category | Productivity |
| Language | English |

Upload assets from `store/assets/`:
- Icon: `dist/icons/icon128.png`
- Small promo tile: `promo-tile-440x280.png`
- Screenshots: `screenshot-1-github-answer.png`, `screenshot-2-wikipedia.png`, `screenshot-3-followup.png`

### 4. Privacy Practices Tab

| Question | Answer |
|----------|--------|
| Single purpose | Paste from LISTING.md "Single Purpose Description" |
| Permission justifications | Paste each from `store/JUSTIFICATIONS.md` |
| Data use certification | Certify "limited use" (no selling, no unrelated purposes, no creditworthiness, only what's needed for functionality) |
| Privacy policy URL | `https://onboardai-shoofly.netlify.app/#privacy` |

### 5. Distribution Tab

| Setting | Value |
|---------|-------|
| Visibility | **Unlisted** |
| Regions | All regions |

> **Why Unlisted?** The extension works immediately for anyone with the direct link. It won't appear in CWS search, so beta users still install via the landing page — but they get the one-click CWS install instead of load-unpacked. You can flip to Public later with no re-review (unless you change permissions).

### 6. Submit for Review

1. Click **Submit for Review**.
2. Typical review time: **1–2 weeks** for extensions with `<all_urls>`.
3. You'll receive an email when approved or if changes are requested.

---

## After Approval

1. Copy the CWS listing URL (e.g., `https://chrome.google.com/webstore/detail/onboardai-by-shoofly/EXTENSION_ID`).
2. In `landing/index.html`, set `const CWS_URL = '...'` to that URL.
3. Redeploy the landing page — the hero CTA will become "Add to Chrome" and the manual wizard will collapse into a details accordion.

---

## Optional: Edge Add-ons

Microsoft Edge Add-ons accepts the same zip and has **no registration fee**. The review process is similar but often faster. Submit at https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview after the CWS listing is live (Edge's dashboard can import from CWS directly).
