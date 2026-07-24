// Shadow-DOM stylesheets. `:host { all: initial }` isolates us from page
// styles; everything inside uses explicit values.
//
// Shoofly brand: navy #0a1628 bg, surface #0d2035, teal #3eb8d0 accent
// (hover #2a9db5), gold CTA #e8b848→#d4a84a, text #fffef5, muted #a8d5df.

export const POPUP_CSS = `
:host {
  all: initial;
}
* {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.box {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 420px;
  max-width: 92vw;
  background: rgba(10, 22, 40, 0.97);
  color: #fffef5;
  border: 1px solid rgba(62, 184, 208, 0.35);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(3, 8, 16, 0.55), 0 2px 8px rgba(3, 8, 16, 0.35), 0 0 0 1px rgba(62, 184, 208, 0.08);
  font-size: 13.5px;
  line-height: 1.45;
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(62, 184, 208, 0.18);
  background: #0d2035;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  background: #3eb8d0;
  color: #0a1628;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.feature {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 13px;
  color: #fffef5;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #a8d5df;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}
.icon-btn:hover { background: rgba(62, 184, 208, 0.18); color: #fffef5; }
.msgs {
  overflow-y: auto;
  max-height: 240px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.box.expanded .msgs { max-height: 60vh; }
.msg-user {
  align-self: flex-end;
  max-width: 85%;
  padding: 6px 11px;
  border-radius: 14px 14px 4px 14px;
  background: #3eb8d0;
  color: #0a1628;
  font-weight: 500;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.msg-ai {
  align-self: flex-start;
  max-width: 100%;
  padding: 7px 11px;
  border-radius: 14px 14px 14px 4px;
  background: rgba(255, 254, 245, 0.06);
  border: 1px solid rgba(62, 184, 208, 0.16);
  color: #fffef5;
  overflow-wrap: break-word;
}
.msg-ai p { margin: 0 0 6px; }
.msg-ai p:last-child { margin-bottom: 0; }
.msg-ai ul { margin: 0 0 6px; padding-left: 18px; }
.msg-ai ul:last-child { margin-bottom: 0; }
.msg-ai li { margin: 2px 0; }
.msg-ai strong { font-weight: 700; color: #ffffff; }
.msg-ai code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: rgba(62, 184, 208, 0.16);
  color: #a8d5df;
  border-radius: 4px;
  padding: 0 4px;
}
.msg-error {
  align-self: flex-start;
  max-width: 100%;
  padding: 7px 11px;
  border-radius: 12px;
  background: rgba(220, 38, 38, 0.14);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #fda4a4;
}
.msg-error button {
  display: block;
  margin-top: 6px;
  padding: 5px 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #e8b848, #d4a84a);
  color: #0a1628;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.msg-error button:hover { filter: brightness(1.08); }
.msg-consent {
  align-self: flex-start;
  max-width: 100%;
  padding: 8px 11px;
  border-radius: 12px;
  background: rgba(232, 184, 72, 0.1);
  border: 1px solid rgba(232, 184, 72, 0.45);
  color: #fffef5;
}
.msg-consent button {
  display: block;
  margin-top: 7px;
  padding: 5px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #e8b848, #d4a84a);
  color: #0a1628;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.msg-consent button:hover { filter: brightness(1.08); }
.loader {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 2px;
}
.loader span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3eb8d0;
  animation: onboardai-bounce 1s infinite;
}
.loader span:nth-child(2) { animation-delay: 0.12s; }
.loader span:nth-child(3) { animation-delay: 0.24s; }
@keyframes onboardai-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
.footer {
  border-top: 1px solid rgba(62, 184, 208, 0.18);
  padding: 8px 10px 7px;
  background: rgba(13, 32, 53, 0.6);
}
.input-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.input-row input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 11px;
  border: 1.5px solid rgba(168, 213, 223, 0.25);
  border-radius: 9px;
  background: rgba(255, 254, 245, 0.06);
  color: #fffef5;
  font-size: 13px;
  outline: none;
}
.input-row input:focus { border-color: #3eb8d0; background: rgba(255, 254, 245, 0.1); }
.input-row input::placeholder { color: rgba(168, 213, 223, 0.55); }
.send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8b848, #d4a84a);
  color: #0a1628;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}
.send:hover { filter: brightness(1.08); }
.send:disabled { opacity: 0.35; cursor: default; filter: none; }
.hint {
  margin: 6px 1px 0;
  font-size: 10.5px;
  color: rgba(168, 213, 223, 0.65);
}
.hint-lock {
  margin: 3px 1px 0;
  font-size: 10.5px;
  color: rgba(168, 213, 223, 0.85);
}
`;

// Guide-mode spotlight: one fixed "cutout" div whose giant box-shadow dims
// the rest of the page while a teal ring hugs the hovered element. The whole
// layer is pointer-events: none so the existing ⌘-click capture path is
// untouched. The chip is a teal label pill positioned by JS.
export const SPOTLIGHT_CSS = `
:host {
  all: initial;
}
* {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.layer {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  overflow: hidden;
}
.cutout {
  position: fixed;
  pointer-events: none;
  border-radius: 6px;
  box-shadow:
    0 0 0 2px #3eb8d0,
    0 0 0 200vmax rgba(10, 22, 40, 0.5);
}
@media (prefers-reduced-motion: no-preference) {
  .cutout {
    transition: left 90ms ease-out, top 90ms ease-out, width 90ms ease-out,
      height 90ms ease-out, border-radius 90ms ease-out;
  }
}
.cutout.backdrop {
  box-shadow: 0 0 0 200vmax rgba(10, 22, 40, 0.5);
  transition: none;
}
.chip {
  position: fixed;
  pointer-events: none;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 3px 10px;
  border-radius: 999px;
  background: #3eb8d0;
  color: #0a1628;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 2px 8px rgba(3, 8, 16, 0.4);
}
`;

// Guided tour overlay: spotlight ring with pulsing gold animation, tooltip panel
// with progress bar and navigation controls. Uses same Shadow DOM isolation.
export const TOUR_CSS = `
:host {
  all: initial;
}
* {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.layer {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  overflow: hidden;
}
/* Dim backdrop */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 22, 40, 0.65);
  pointer-events: auto;
}
/* Spotlight cutout for target element */
.cutout {
  position: fixed;
  pointer-events: none;
  border-radius: 8px;
  box-shadow: 0 0 0 3px #e8b848;
  animation: tour-pulse 2s ease-in-out infinite;
}
@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 3px #e8b848, 0 0 0 6px rgba(232, 184, 72, 0.3); }
  50% { box-shadow: 0 0 0 3px #e8b848, 0 0 0 12px rgba(232, 184, 72, 0.15); }
}
@media (prefers-reduced-motion: reduce) {
  .cutout { animation: none; box-shadow: 0 0 0 3px #e8b848; }
}
/* Tooltip panel */
.tooltip {
  position: fixed;
  pointer-events: auto;
  width: 320px;
  max-width: calc(100vw - 32px);
  background: rgba(10, 22, 40, 0.97);
  border: 1px solid rgba(62, 184, 208, 0.35);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(3, 8, 16, 0.55), 0 2px 8px rgba(3, 8, 16, 0.35);
  overflow: hidden;
}
/* Progress bar header */
.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(62, 184, 208, 0.18);
  background: #0d2035;
}
.progress-text {
  font-size: 11px;
  font-weight: 700;
  color: #a8d5df;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.progress-bar {
  flex: 1;
  height: 4px;
  margin-left: 12px;
  background: rgba(62, 184, 208, 0.2);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3eb8d0, #e8b848);
  border-radius: 2px;
  transition: width 200ms ease-out;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #a8d5df;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}
.close-btn:hover { background: rgba(62, 184, 208, 0.18); color: #fffef5; }
/* Content area */
.content {
  padding: 16px;
}
.title {
  font-size: 16px;
  font-weight: 700;
  color: #fffef5;
  margin-bottom: 8px;
  line-height: 1.3;
}
.description {
  font-size: 13.5px;
  color: #a8d5df;
  line-height: 1.5;
  margin-bottom: 4px;
}
/* Action hint */
.action-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 10px;
  background: rgba(232, 184, 72, 0.12);
  border: 1px solid rgba(232, 184, 72, 0.35);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #e8b848;
}
.action-hint svg {
  width: 14px;
  height: 14px;
}
/* Navigation footer */
.nav-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-top: 1px solid rgba(62, 184, 208, 0.18);
  background: rgba(13, 32, 53, 0.6);
}
.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.nav-btn.back {
  background: rgba(62, 184, 208, 0.15);
  color: #a8d5df;
}
.nav-btn.back:hover { background: rgba(62, 184, 208, 0.25); color: #fffef5; }
.nav-btn.back:disabled { opacity: 0.4; cursor: default; }
.nav-btn.next {
  background: linear-gradient(135deg, #e8b848, #d4a84a);
  color: #0a1628;
}
.nav-btn.next:hover { filter: brightness(1.08); }
.nav-btn.skip {
  background: transparent;
  color: #a8d5df;
  padding: 8px 10px;
}
.nav-btn.skip:hover { color: #fffef5; }
/* Input mode styling */
.input-wrapper {
  margin-top: 12px;
}
.tour-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1.5px solid rgba(168, 213, 223, 0.25);
  border-radius: 9px;
  background: rgba(255, 254, 245, 0.06);
  color: #fffef5;
  font-size: 14px;
  outline: none;
}
.tour-input:focus { border-color: #3eb8d0; background: rgba(255, 254, 245, 0.1); }
.tour-input::placeholder { color: rgba(168, 213, 223, 0.55); }
/* Copy button */
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #3eb8d0;
  color: #0a1628;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.copy-btn:hover { filter: brightness(1.1); }
.copy-btn.copied { background: #22c55e; }
/* Element not found state */
.not-found {
  padding: 10px 14px;
  margin-top: 8px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: 8px;
  font-size: 12.5px;
  color: #fda4a4;
}
/* Tour complete celebration */
.complete {
  text-align: center;
  padding: 24px 16px;
}
.complete-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.complete-title {
  font-size: 18px;
  font-weight: 700;
  color: #fffef5;
  margin-bottom: 6px;
}
.complete-sub {
  font-size: 13.5px;
  color: #a8d5df;
}
.complete-btn {
  margin-top: 16px;
  padding: 10px 24px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #e8b848, #d4a84a);
  color: #0a1628;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.complete-btn:hover { filter: brightness(1.08); }
`;
