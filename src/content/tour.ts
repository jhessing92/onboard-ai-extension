// Tour engine: fetch tours, track progress, handle step advancement, cross-page persistence.

import type { Tour, TourState } from '../shared/tourTypes';
import { TourOverlay } from './tourOverlay';

const TOUR_BASE_URL = 'https://onboardai-shoofly.netlify.app/tours';
const STORAGE_KEY = 'onboardai_tour_state';

export class TourEngine {
  private overlay: TourOverlay | null = null;
  private tour: Tour | null = null;
  private stepIndex = 0;
  private urlChangeListener: (() => void) | null = null;

  async init(): Promise<void> {
    // Check for ?onboard= URL parameter
    const params = new URLSearchParams(window.location.search);
    const tourId = params.get('onboard');

    if (tourId) {
      // Start new tour from URL param
      await this.startTour(tourId);
    } else {
      // Check for existing tour state (cross-page resume)
      await this.resumeTour();
    }
  }

  async startTour(tourId: string): Promise<void> {
    // Clean URL by removing onboard param (don't want it in history)
    const url = new URL(window.location.href);
    url.searchParams.delete('onboard');
    window.history.replaceState({}, '', url.toString());

    // Fetch tour config
    const tour = await this.fetchTour(tourId);
    if (!tour) {
      console.warn(`[OnboardAI] Tour not found: ${tourId}`);
      return;
    }

    this.tour = tour;
    this.stepIndex = 0;
    await this.saveState();
    this.showCurrentStep();
  }

  private async resumeTour(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    // Check if state is stale (older than 24 hours)
    if (Date.now() - state.startedAt > 24 * 60 * 60 * 1000) {
      await this.clearState();
      return;
    }

    // Fetch tour config
    const tour = await this.fetchTour(state.tourId);
    if (!tour) {
      await this.clearState();
      return;
    }

    this.tour = tour;
    this.stepIndex = state.stepIndex;
    this.showCurrentStep();
  }

  private async fetchTour(tourId: string): Promise<Tour | null> {
    try {
      // Try fetching from Netlify hosted JSON
      const res = await fetch(`${TOUR_BASE_URL}/${tourId}.json`);
      if (!res.ok) {
        // Fallback: check if there's a preview tour in localStorage
        const preview = localStorage.getItem(`onboardai_preview_${tourId}`);
        if (preview) {
          return JSON.parse(preview) as Tour;
        }
        return null;
      }
      return await res.json() as Tour;
    } catch (e) {
      console.error('[OnboardAI] Failed to fetch tour:', e);
      return null;
    }
  }

  private showCurrentStep(): void {
    if (!this.tour || this.stepIndex >= this.tour.steps.length) {
      this.handleComplete();
      return;
    }

    const step = this.tour.steps[this.stepIndex];
    this.overlay ??= new TourOverlay();
    this.overlay.show(step, this.stepIndex, this.tour.steps.length, {
      onBack: () => this.goBack(),
      onNext: () => this.goNext(),
      onSkip: () => this.goNext(),
      onExit: () => this.exitTour(),
      onInputChange: (value) => this.handleInputChange(value),
    });

    // Set up URL change listener if step advances on urlChange
    if (step.nextOn === 'urlChange') {
      this.setupUrlChangeListener();
    }
  }

  private setupUrlChangeListener(): void {
    this.removeUrlChangeListener();

    let lastUrl = window.location.href;
    const check = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        // Small delay to let new page render
        setTimeout(() => this.goNext(), 300);
      }
    };

    // Check on popstate and periodically (for SPA navigation)
    window.addEventListener('popstate', check);
    const interval = setInterval(check, 500);

    this.urlChangeListener = () => {
      window.removeEventListener('popstate', check);
      clearInterval(interval);
    };
  }

  private removeUrlChangeListener(): void {
    if (this.urlChangeListener) {
      this.urlChangeListener();
      this.urlChangeListener = null;
    }
  }

  private handleInputChange(value: string): void {
    // Could be used for validation or auto-advance
    console.log('[OnboardAI] Input changed:', value);
  }

  private async goBack(): Promise<void> {
    if (this.stepIndex > 0) {
      this.stepIndex--;
      await this.saveState();
      this.showCurrentStep();
    }
  }

  private async goNext(): Promise<void> {
    this.removeUrlChangeListener();
    this.stepIndex++;
    await this.saveState();

    if (this.tour && this.stepIndex >= this.tour.steps.length) {
      this.handleComplete();
    } else {
      this.showCurrentStep();
    }
  }

  private handleComplete(): void {
    this.overlay ??= new TourOverlay();
    this.overlay.showComplete(() => this.exitTour());
  }

  private async exitTour(): Promise<void> {
    this.removeUrlChangeListener();
    this.overlay?.destroy();
    this.overlay = null;
    this.tour = null;
    this.stepIndex = 0;
    await this.clearState();
  }

  private async saveState(): Promise<void> {
    if (!this.tour) return;
    const state: TourState = {
      tourId: this.tour.id,
      stepIndex: this.stepIndex,
      startedAt: Date.now(),
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
  }

  private async loadState(): Promise<TourState | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  }

  private async clearState(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}

// Create singleton instance
let engineInstance: TourEngine | null = null;

export function initTourEngine(): TourEngine {
  if (!engineInstance) {
    engineInstance = new TourEngine();
  }
  return engineInstance;
}
