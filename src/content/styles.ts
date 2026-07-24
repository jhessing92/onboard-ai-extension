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
