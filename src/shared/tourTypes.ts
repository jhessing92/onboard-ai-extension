// Guided tour data model — used by extension overlay and admin dashboard.

export interface Tour {
  id: string;           // e.g., "workmate-ghl-connect"
  name: string;         // "Connect GoHighLevel"
  startUrl: string;     // URL pattern where tour begins
  steps: TourStep[];
}

export interface TourStep {
  id: string;
  selector: string;     // CSS selector for target element
  action: 'click' | 'input' | 'copy' | 'observe';
  title: string;        // "Click Settings"
  description: string;  // "Find the gear icon in the top right"
  inputPlaceholder?: string;  // For 'input' actions
  nextOn: 'click' | 'urlChange' | 'manual';  // When to advance
  position?: 'top' | 'bottom' | 'left' | 'right';  // Tooltip position
}

// Persisted in chrome.storage.local while a tour is active
export interface TourState {
  tourId: string;
  stepIndex: number;
  startedAt: number;
}

// Tour fetch response from Netlify
export interface TourFetchResult {
  success: boolean;
  tour?: Tour;
  error?: string;
}
