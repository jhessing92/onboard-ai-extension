# OnboardAI Extension

Chrome extension that helps users understand and interact with web applications through AI-powered assistance and guided tours.

## Live URLs
- **Landing/Admin**: https://onboardai-shoofly.netlify.app
- **Admin Dashboard**: https://onboardai-shoofly.netlify.app/admin
- **Tour JSON**: https://onboardai-shoofly.netlify.app/tours/{tour-id}.json

## Core Features

### 1. AI Assistant (Option-click)
- **Trigger**: Option-click (Mac) / Alt-click (Windows) on any element
- Shows sparkle cursor when Option/Alt is held
- Opens popup with AI explanation of the clicked element
- Shadow DOM isolation for CSP safety

### 2. Guided Tours
- Step-by-step onboarding overlays
- Activated via URL parameter: `?onboard={tour-id}`
- Cross-page persistence via `chrome.storage.local`
- Tours fetched from Netlify: `/tours/{id}.json`

#### Tour Step Types
| Action | Behavior |
|--------|----------|
| `click` | Highlight element, advance when clicked |
| `input` | Highlight input field, advance on change |
| `copy` | Highlight text, advance on clipboard write |
| `observe` | Info only, "Next" button to advance |

### 3. Admin Dashboard
- Netlify Identity authentication
- Visual tour builder with drag-and-drop steps
- AI document parser (Claude Opus 4.5) to generate steps from onboarding docs
- Export tours as JSON

## Project Structure

```
onboard-ai-extension/
├── src/
│   ├── content/
│   │   ├── index.ts          # Main content script entry
│   │   ├── trigger.ts        # Option-click trigger handling
│   │   ├── tour.ts           # TourEngine class
│   │   ├── tourOverlay.ts    # Tour UI (spotlight, tooltip, progress)
│   │   ├── spotlight.ts      # Element highlighting
│   │   └── styles.ts         # CSS-in-JS styles
│   ├── shared/
│   │   └── tourTypes.ts      # Tour/TourStep interfaces
│   └── background/
│       └── index.ts          # Service worker
├── landing/                   # Netlify site
│   ├── index.html            # Landing page
│   ├── admin.html            # Tour builder dashboard
│   ├── tours/                # Tour JSON files
│   │   ├── test.json
│   │   └── connect-ghl.json
│   └── netlify/
│       └── functions/
│           └── anthropic.js  # Claude API proxy
├── public/
│   └── icons/                # Extension icons
└── dist/                     # Built extension (load in Chrome)
```

## Development

### Build Extension
```bash
npm run build
```

### Load in Chrome
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` folder

### Deploy Landing/Admin
```bash
cd landing
npx netlify deploy --prod --dir=. --functions=netlify/functions
```

## Environment Variables (Netlify)
- `ANTHROPIC_API_KEY` - For AI document parser (Claude Opus 4.5)

## Tour Data Model

```typescript
interface Tour {
  id: string;
  name: string;
  startUrl: string;
  steps: TourStep[];
}

interface TourStep {
  id: string;
  selector: string;
  action: 'click' | 'input' | 'copy' | 'observe';
  title: string;
  description: string;
  nextOn: 'click' | 'urlChange' | 'manual';
  position?: 'top' | 'bottom' | 'left' | 'right';
}
```

## Testing Tours
Visit any page with `?onboard={tour-id}`:
```
https://example.com?onboard=test
https://app.workmate.com/settings?onboard=connect-ghl
```

## Recent Changes (July 2026)
- Implemented guided tour system with overlay UI
- Added admin dashboard with Netlify Identity auth
- Added AI document parser using Claude Opus 4.5
- Changed trigger from Cmd-click to Option-click (avoids browser conflicts)
- Fixed Anthropic function (CommonJS format for Netlify Functions)
- Model: `claude-opus-4-5-20251101`
