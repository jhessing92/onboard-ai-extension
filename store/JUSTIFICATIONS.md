# Permission Justifications — OnboardAI by Shoofly

Copy-paste text for the CWS "Justify your permissions" fields.

---

## `storage`

```
Stores the user's preferred Claude model and on/off toggle in chrome.storage.local on the user's device only. No user accounts or data syncing.
```

## `host_permissions: https://onboardai-shoofly.netlify.app/*`

```
The proxy endpoint that forwards requests to Anthropic's Messages API. When the user ⌘-clicks an element, the extension sends the sanitized context to this Netlify function, which adds the API key server-side and streams the answer back. The function logs nothing and stores nothing.
```

## Content script on `<all_urls>` (Match Pattern)

```
OnboardAI is an on-page explainer for any website — the user may use it on internal tools, SaaS dashboards, documentation, or any other page they visit. The content script draws the spotlight overlay and answer popup on the active page, and extracts a sanitized context snapshot (element label, nearby static text, page title with email scrubbed, URL as origin+path only) when the user ⌘-clicks.

The content script reads page content only at the moment the user triggers an explanation; it never reads form values, passwords, contenteditable regions, or URL query strings. Full privacy policy: https://onboardai-shoofly.netlify.app/#privacy
```

---

## Remote Code Policy (Manifest V3)

OnboardAI loads no remote code. All scripts are bundled in the extension package and served under the manifest's strict CSP (`script-src 'self'; object-src 'none'; base-uri 'self'`).
