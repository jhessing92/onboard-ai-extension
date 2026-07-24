# OnboardAI by Shoofly — Privacy

OnboardAI is used on pages where people type sensitive things. It is built so
that it is **provably unable to read, store, or transmit what you type**. This
document is the canonical privacy statement.

## The one-sentence version

OnboardAI only looks at a page when you ⌘-click, it never reads form values or
URL tokens, and all AI processing happens through Anthropic's zero-retention
commercial API.

## What OnboardAI sends (only when you ⌘-click an element)

- The clicked element's **visible label** (button text, link text, aria-label)
- The clicked element's **sanitized HTML** — attribute-whitelisted, with all
  form controls and editors emptied
- Nearby **static page text**, the page **title** (email addresses scrubbed),
  navigation link labels, and top headings
- The page **URL as origin + path only** (e.g. `https://app.example.com/settings`)

This context goes to Anthropic's Messages API via a Shoofly-hosted proxy that
adds the API key server-side. There is no Shoofly database, no analytics, no
telemetry, no user accounts.

## What OnboardAI can never see

| Vector | Protection |
| --- | --- |
| Form values & passwords | Field values are never read. `value` is excluded from the attribute whitelist, and every `input`/`textarea`/`select` is emptied before HTML is serialized. |
| Rich-text editors & live previews | Any `contenteditable` content is skipped by the text walker and stripped from serialized HTML — what you type in editors never leaves the page. |
| URL tokens | Query strings and hashes (session tokens, reset links, OAuth codes) are never sent — only origin + pathname. |
| Your identity in the tab title | Email addresses are scrubbed from the page title before sending. |
| Background snooping | The content script does nothing until you hold ⌘/Ctrl and click. There are no keyboard-value listeners, no clipboard access, no screenshots. |

## Permissions, justified

- **`storage`** — save your model preference and on/off toggle locally.
- **`host_permissions: https://onboardai-shoofly.netlify.app/*`** — the proxy
  endpoint that forwards requests to Anthropic with the API key added server-side.
- **Content script on `<all_urls>`** — OnboardAI is an on-page guide for *any*
  website, so it must be able to draw its popup and spotlight on the page you're
  viewing. It reads page content only at the moment you ⌘-click, subject to all
  the redactions above.

Defense in depth: extension pages run under a strict CSP
(`script-src 'self'; object-src 'none'; base-uri 'self'`) so no remote code can
ever be injected.

## Data processor

The only third party that receives any data is **Anthropic PBC** (San Francisco,
CA). Requests are proxied through a Shoofly-hosted Netlify function that adds
the API key — the function itself logs nothing and stores nothing. Anthropic
processes this data solely to generate the streamed answer under their
**zero-retention commercial API policy**: inputs and outputs are not stored or
used to train models. See Anthropic's [commercial terms](https://www.anthropic.com/legal/commercial-terms)
and [privacy policy](https://www.anthropic.com/legal/privacy).

## Data retention

None. Nothing is logged or stored by Shoofly. Conversation context lives in
memory for the life of a popup and is gone when you close it. Anthropic's
commercial API has a zero-retention policy for API traffic.
