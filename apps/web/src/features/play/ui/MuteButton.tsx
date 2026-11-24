"use client";

import { useSettingsStore } from "@/stores/settings.store";

/** Shipped with the component: the equalizer bars and their dance. */
const CSS = String.raw`
.eq-bar { transform-origin: 50% 100%; transform-box: fill-box; animation: eq 1.1s ease-in-out infinite; }
.eq-bar:nth-child(2) { animation-duration: 0.8s; animation-delay: -0.3s; }
.eq-bar:nth-child(3) { animation-duration: 1.3s; animation-delay: -0.6s; }
.eq-bar:nth-child(4) { animation-duration: 0.95s; animation-delay: -0.15s; }
@keyframes eq { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
[data-muted="true"] .eq-bar { animation: none; transform: scaleY(0.18); }
@media (prefers-reduced-motion: reduce) { .eq-bar { animation: none; } }
`;

/**
 * Sound on or off, as the machine's own little level meter: the bars dance
 * while sound is on and lie flat when muted. Remembered on this device.
 */
export function MuteButton() {
  const muted = useSettingsStore((s) => s.muted);
  const toggle = useSettingsStore((s) => s.toggleMuted);
  return (
    <>
      <style href="claw-eq" precedence="default">
        {CSS}
      </style>
      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        aria-pressed={muted}
        data-muted={muted}
        className="pointer-events-auto grid size-10 place-items-center rounded-full bg-[rgb(16_9_14/0.42)] text-paper/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_0_1px_rgba(255,255,255,0.13),0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-[14px] transition-[background-color,box-shadow,transform] duration-300 hover:bg-[rgb(16_9_14/0.55)] hover:text-paper hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.24)] active:scale-95"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
          <rect className="eq-bar" x="2" y="3" width="2" height="10" rx="1" />
          <rect className="eq-bar" x="5.5" y="3" width="2" height="10" rx="1" />
          <rect className="eq-bar" x="9" y="3" width="2" height="10" rx="1" />
          <rect className="eq-bar" x="12.5" y="3" width="2" height="10" rx="1" />
        </svg>
      </button>
    </>
  );
}
