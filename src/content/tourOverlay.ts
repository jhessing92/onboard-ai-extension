// Tour overlay UI: spotlight ring, tooltip panel, progress bar, navigation.
// Uses Shadow DOM isolation like the main spotlight/popup components.

import type { TourStep } from '../shared/tourTypes';
import { TOUR_CSS } from './styles';

const TOOLTIP_GAP = 12;
const MARGIN = 16;

export interface TourOverlayCallbacks {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onExit: () => void;
  onInputChange?: (value: string) => void;
}

export class TourOverlay {
  private host: HTMLDivElement | null = null;
  private backdrop: HTMLDivElement | null = null;
  private cutout: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private raf = 0;
  private visible = false;
  private currentStep: TourStep | null = null;
  private stepIndex = 0;
  private totalSteps = 0;
  private callbacks: TourOverlayCallbacks | null = null;
  private targetEl: Element | null = null;

  private readonly onReposition = (): void => this.schedule();

  show(
    step: TourStep,
    stepIndex: number,
    totalSteps: number,
    callbacks: TourOverlayCallbacks
  ): void {
    this.currentStep = step;
    this.stepIndex = stepIndex;
    this.totalSteps = totalSteps;
    this.callbacks = callbacks;
    this.ensureDom();
    this.visible = true;
    this.host!.style.display = '';
    window.addEventListener('scroll', this.onReposition, { capture: true, passive: true });
    window.addEventListener('resize', this.onReposition, { passive: true });
    this.findAndHighlight();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('scroll', this.onReposition, { capture: true });
    window.removeEventListener('resize', this.onReposition);
    if (this.host) this.host.style.display = 'none';
  }

  destroy(): void {
    this.hide();
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.backdrop = null;
    this.cutout = null;
    this.tooltip = null;
    this.targetEl = null;
    this.callbacks = null;
  }

  // Show tour complete state
  showComplete(onClose: () => void): void {
    this.ensureDom();
    this.visible = true;
    this.host!.style.display = '';

    // Hide cutout, show completion tooltip
    if (this.cutout) this.cutout.style.display = 'none';
    if (this.tooltip) {
      this.tooltip.innerHTML = `
        <div class="complete">
          <div class="complete-icon">✓</div>
          <div class="complete-title">Tour Complete!</div>
          <div class="complete-sub">You've completed all the steps.</div>
          <button class="complete-btn">Done</button>
        </div>
      `;
      this.tooltip.style.left = '50%';
      this.tooltip.style.top = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      const btn = this.tooltip.querySelector('.complete-btn');
      btn?.addEventListener('click', () => onClose());
    }
  }

  private ensureDom(): void {
    if (this.host) return;

    this.host = document.createElement('div');
    this.host.setAttribute('data-onboardai-tour', '');
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Apply styles
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(TOUR_CSS);
      this.shadow.adoptedStyleSheets = [sheet];
    } catch {
      const style = document.createElement('style');
      style.textContent = TOUR_CSS;
      this.shadow.appendChild(style);
    }

    const layer = document.createElement('div');
    layer.className = 'layer';

    // Backdrop (click to exit)
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'backdrop';
    this.backdrop.addEventListener('click', () => this.callbacks?.onExit());

    // Cutout spotlight
    this.cutout = document.createElement('div');
    this.cutout.className = 'cutout';

    // Tooltip panel
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';

    layer.append(this.backdrop, this.cutout, this.tooltip);
    this.shadow.appendChild(layer);
    document.documentElement.appendChild(this.host);
  }

  private findAndHighlight(): void {
    if (!this.currentStep || !this.visible) return;

    // Find target element
    this.targetEl = document.querySelector(this.currentStep.selector);

    if (this.targetEl) {
      // Scroll element into view if needed
      const rect = this.targetEl.getBoundingClientRect();
      const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!inView) {
        this.targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Re-render after scroll animation
        setTimeout(() => this.paint(), 350);
      }

      // Set up click listener for 'click' action
      if (this.currentStep.action === 'click') {
        this.targetEl.addEventListener('click', this.handleTargetClick, { once: true, capture: true });
      }
    }

    this.paint();
  }

  private handleTargetClick = (): void => {
    if (this.currentStep?.nextOn === 'click') {
      this.callbacks?.onNext();
    }
  };

  private schedule(): void {
    if (this.raf || !this.visible) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }

  private paint(): void {
    if (!this.visible || !this.cutout || !this.tooltip || !this.currentStep) return;

    const step = this.currentStep;
    const found = !!this.targetEl && this.targetEl.isConnected;

    // Position cutout around target
    if (found && this.targetEl) {
      const rect = this.targetEl.getBoundingClientRect();
      const pad = 4;
      this.cutout.style.display = '';
      this.cutout.style.left = `${rect.left - pad}px`;
      this.cutout.style.top = `${rect.top - pad}px`;
      this.cutout.style.width = `${rect.width + pad * 2}px`;
      this.cutout.style.height = `${rect.height + pad * 2}px`;

      // Match border-radius of target
      const br = getComputedStyle(this.targetEl).borderRadius;
      this.cutout.style.borderRadius = br && br !== '0px' ? br : '8px';
    } else {
      this.cutout.style.display = 'none';
    }

    // Build tooltip content
    this.renderTooltip(step, found);

    // Position tooltip
    if (found && this.targetEl) {
      this.positionTooltip(this.targetEl.getBoundingClientRect(), step.position);
    } else {
      // Center tooltip when element not found
      this.tooltip.style.left = '50%';
      this.tooltip.style.top = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }

  private renderTooltip(step: TourStep, elementFound: boolean): void {
    if (!this.tooltip) return;

    const progress = ((this.stepIndex + 1) / this.totalSteps) * 100;
    const isFirst = this.stepIndex === 0;
    const isLast = this.stepIndex === this.totalSteps - 1;

    let actionHint = '';
    let actionContent = '';

    switch (step.action) {
      case 'click':
        actionHint = `
          <div class="action-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 15l-2 5L9 9l11 4-5 2z"/>
              <path d="M20.5 11.5l-1.7-1.7"/>
            </svg>
            Click the highlighted element
          </div>`;
        break;
      case 'input':
        actionContent = `
          <div class="input-wrapper">
            <input type="text" class="tour-input" placeholder="${step.inputPlaceholder || 'Enter value...'}" />
          </div>`;
        actionHint = `
          <div class="action-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Enter the value above
          </div>`;
        break;
      case 'copy':
        actionContent = `<button class="copy-btn">📋 Copy to Clipboard</button>`;
        break;
      case 'observe':
        actionHint = `
          <div class="action-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            Take note of this
          </div>`;
        break;
    }

    const notFoundHtml = !elementFound ? `
      <div class="not-found">
        Element not found. It may appear after navigating or loading.
      </div>` : '';

    this.tooltip.innerHTML = `
      <div class="progress-header">
        <span class="progress-text">Step ${this.stepIndex + 1} of ${this.totalSteps}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <button class="close-btn" title="Exit tour">✕</button>
      </div>
      <div class="content">
        <div class="title">${this.escapeHtml(step.title)}</div>
        <div class="description">${this.escapeHtml(step.description)}</div>
        ${notFoundHtml}
        ${actionContent}
        ${actionHint}
      </div>
      <div class="nav-footer">
        <button class="nav-btn back" ${isFirst ? 'disabled' : ''}>← Back</button>
        <button class="nav-btn skip">Skip</button>
        <button class="nav-btn next">${isLast ? 'Finish' : 'Next →'}</button>
      </div>
    `;

    // Wire up event listeners
    this.tooltip.querySelector('.close-btn')?.addEventListener('click', () => this.callbacks?.onExit());
    this.tooltip.querySelector('.nav-btn.back')?.addEventListener('click', () => this.callbacks?.onBack());
    this.tooltip.querySelector('.nav-btn.skip')?.addEventListener('click', () => this.callbacks?.onSkip());
    this.tooltip.querySelector('.nav-btn.next')?.addEventListener('click', () => this.callbacks?.onNext());

    // Input change handler
    const input = this.tooltip.querySelector('.tour-input') as HTMLInputElement | null;
    if (input) {
      input.addEventListener('input', () => this.callbacks?.onInputChange?.(input.value));
    }

    // Copy button handler
    const copyBtn = this.tooltip.querySelector('.copy-btn');
    if (copyBtn && this.targetEl) {
      const textToCopy = this.targetEl.textContent?.trim() || '';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(textToCopy);
          copyBtn.textContent = '✓ Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => this.callbacks?.onNext(), 800);
        } catch {
          copyBtn.textContent = 'Copy failed';
        }
      });
    }
  }

  private positionTooltip(targetRect: DOMRect, position?: 'top' | 'bottom' | 'left' | 'right'): void {
    if (!this.tooltip) return;

    this.tooltip.style.transform = '';
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = 0;
    let top = 0;

    // Auto-position if not specified
    const pos = position || this.autoPosition(targetRect, tw, th);

    switch (pos) {
      case 'bottom':
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        top = targetRect.bottom + TOOLTIP_GAP;
        break;
      case 'top':
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        top = targetRect.top - th - TOOLTIP_GAP;
        break;
      case 'right':
        left = targetRect.right + TOOLTIP_GAP;
        top = targetRect.top + targetRect.height / 2 - th / 2;
        break;
      case 'left':
        left = targetRect.left - tw - TOOLTIP_GAP;
        top = targetRect.top + targetRect.height / 2 - th / 2;
        break;
    }

    // Clamp to viewport
    left = Math.max(MARGIN, Math.min(left, vw - tw - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - th - MARGIN));

    this.tooltip.style.left = `${Math.round(left)}px`;
    this.tooltip.style.top = `${Math.round(top)}px`;
  }

  private autoPosition(rect: DOMRect, tw: number, th: number): 'top' | 'bottom' | 'left' | 'right' {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = vw - rect.right;
    const spaceLeft = rect.left;

    // Prefer bottom, then top, then right, then left
    if (spaceBelow >= th + TOOLTIP_GAP + MARGIN) return 'bottom';
    if (spaceAbove >= th + TOOLTIP_GAP + MARGIN) return 'top';
    if (spaceRight >= tw + TOOLTIP_GAP + MARGIN) return 'right';
    if (spaceLeft >= tw + TOOLTIP_GAP + MARGIN) return 'left';

    // Default to bottom and let clamping handle it
    return 'bottom';
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
