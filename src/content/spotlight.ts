// Guide-mode spotlight: while ⌘/Ctrl is held, dim the page and ring the
// element under the cursor (the SAME element resolveTarget would ask the AI
// about — WYSIWYG), with a teal label chip above it.
//
// Mechanics: one fixed "cutout" div in our own shadow host; a giant
// box-shadow paints the dim everywhere except the cutout, and a 2px teal
// spread paints the ring. Everything is pointer-events: none, so the
// existing capture-phase ⌘-click trigger path is completely untouched.
import { resolveTarget } from './extract';
import { SPOTLIGHT_CSS } from './styles';

const CHIP_GAP = 6;
const MARGIN = 4;

export class Spotlight {
  private host: HTMLDivElement | null = null;
  private cutout: HTMLDivElement | null = null;
  private chip: HTMLDivElement | null = null;
  private visible = false;
  private target: Element | null = null;
  private lastRect = '';
  private raf = 0;

  private readonly onMouseMove = (e: MouseEvent): void => {
    const first = e.composedPath()[0]; // pierces open shadow DOM
    let el = first instanceof Element ? first : null;
    // Hovering our own UI (the popup): backdrop only. closest() can't cross
    // shadow boundaries, so climb host chain root by root.
    for (let probe: Node | null = el; probe; ) {
      const root = probe.getRootNode();
      if (!(root instanceof ShadowRoot)) break;
      const h = root.host;
      if (h.hasAttribute('data-onboardai') || h.hasAttribute('data-onboardai-spotlight')) {
        el = null;
        break;
      }
      probe = h;
    }
    this.setTarget(el);
  };

  private readonly onReposition = (): void => this.schedule();

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.ensureDom();
    this.target = null;
    this.lastRect = '';
    this.applyBackdropOnly(); // backdrop-only until the first mousemove
    this.host!.style.display = '';
    window.addEventListener('mousemove', this.onMouseMove, { capture: true, passive: true });
    window.addEventListener('scroll', this.onReposition, { capture: true, passive: true });
    window.addEventListener('resize', this.onReposition, { passive: true });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.target = null;
    this.lastRect = '';
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('mousemove', this.onMouseMove, { capture: true });
    window.removeEventListener('scroll', this.onReposition, { capture: true });
    window.removeEventListener('resize', this.onReposition);
    if (this.host) this.host.style.display = 'none';
  }

  destroy(): void {
    this.hide();
    this.host?.remove();
    this.host = null;
    this.cutout = null;
    this.chip = null;
  }

  private ensureDom(): void {
    if (this.host) return;
    this.host = document.createElement('div');
    this.host.setAttribute('data-onboardai-spotlight', '');
    const shadow = this.host.attachShadow({ mode: 'open' });
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(SPOTLIGHT_CSS);
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      const style = document.createElement('style');
      style.textContent = SPOTLIGHT_CSS;
      shadow.appendChild(style);
    }
    const layer = document.createElement('div');
    layer.className = 'layer';
    this.cutout = document.createElement('div');
    this.cutout.className = 'cutout backdrop';
    this.chip = document.createElement('div');
    this.chip.className = 'chip';
    this.chip.style.display = 'none';
    layer.append(this.cutout, this.chip);
    shadow.appendChild(layer);
    document.documentElement.appendChild(this.host);
  }

  private setTarget(el: Element | null): void {
    if (el === this.target) return;
    this.target = el;
    this.lastRect = ''; // force a repaint (border-radius may change too)
    this.schedule();
  }

  private schedule(): void {
    if (this.raf || !this.visible) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }

  private applyBackdropOnly(): void {
    if (!this.cutout || !this.chip) return;
    this.cutout.classList.add('backdrop');
    // Zero-size cutout in the center: pure dim, no ring.
    this.cutout.style.left = '50vw';
    this.cutout.style.top = '50vh';
    this.cutout.style.width = '0px';
    this.cutout.style.height = '0px';
    this.cutout.style.borderRadius = '0px';
    this.chip.style.display = 'none';
  }

  private paint(): void {
    if (!this.visible || !this.cutout || !this.chip) return;
    const t = this.target;
    if (!t || !t.isConnected) {
      this.applyBackdropOnly();
      return;
    }
    const { el, label } = resolveTarget(t);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      this.applyBackdropOnly();
      return;
    }
    const key = `${rect.left},${rect.top},${rect.width},${rect.height}|${label}`;
    if (key === this.lastRect) return; // skip writes when nothing moved
    const radiusChanged = !this.lastRect || this.lastRect.split('|')[1] !== label;
    this.lastRect = key;

    this.cutout.classList.remove('backdrop');
    this.cutout.style.left = `${rect.left - 2}px`;
    this.cutout.style.top = `${rect.top - 2}px`;
    this.cutout.style.width = `${rect.width + 4}px`;
    this.cutout.style.height = `${rect.height + 4}px`;
    if (radiusChanged) {
      const br = getComputedStyle(el).borderRadius;
      this.cutout.style.borderRadius = br && br !== '0px' ? br : '6px';
    }

    // Chip above the cutout; flip below when clipped; clamp horizontally.
    this.chip.style.display = '';
    this.chip.textContent = label;
    const cw = this.chip.offsetWidth;
    const ch = this.chip.offsetHeight;
    let cx = rect.left + rect.width / 2 - cw / 2;
    cx = Math.max(MARGIN, Math.min(cx, window.innerWidth - cw - MARGIN));
    let cy = rect.top - ch - CHIP_GAP - 2;
    if (cy < MARGIN) cy = rect.bottom + CHIP_GAP + 2; // flip below
    cy = Math.max(MARGIN, Math.min(cy, window.innerHeight - ch - MARGIN));
    this.chip.style.left = `${Math.round(cx)}px`;
    this.chip.style.top = `${Math.round(cy)}px`;
  }
}
