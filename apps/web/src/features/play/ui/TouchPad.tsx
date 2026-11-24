"use client";

import type { PointerEvent } from "react";
import { type ButtonId, useControlsStore } from "@/stores/controls.store";

const ARROWS: { id: ButtonId; label: string; area: string; rotate: number }[] = [
  { id: "up", label: "Move back", area: "[grid-area:up]", rotate: 0 },
  { id: "left", label: "Move left", area: "[grid-area:left]", rotate: -90 },
  { id: "right", label: "Move right", area: "[grid-area:right]", rotate: 90 },
  { id: "down", label: "Move forward", area: "[grid-area:down]", rotate: 180 },
];

/**
 * Thumb controls for touch screens. They press the same deck buttons as the
 * mouse and keyboard, so the machine's own buttons light up under your thumbs.
 */
export function TouchPad() {
  const pressed = useControlsStore((s) => s.pressed);
  const press = useControlsStore((s) => s.press);
  const release = useControlsStore((s) => s.release);

  const hold = (id: ButtonId) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      press(id);
    },
    onPointerUp: () => release(id),
    onPointerCancel: () => release(id),
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  });

  return (
    <div className="hidden w-full max-w-md items-end justify-between pointer-coarse:flex">
      <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1.5 [grid-template-areas:'._up_.'_'left_._right'_'._down_.']">
        {ARROWS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-label={a.label}
            className={`${a.area} panel grid size-14 touch-none select-none place-items-center rounded-full transition-colors duration-100 ${pressed[a.id] ? "!border-hot-pink !bg-hot-pink/45" : ""}`}
            {...hold(a.id)}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 text-paper"
              style={{ transform: `rotate(${a.rotate}deg)` }}
              aria-hidden="true"
            >
              <path d="M12 6l6.5 9h-13z" fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`pointer-events-auto size-28 touch-none select-none rounded-full bg-[radial-gradient(circle_at_35%_28%,#ffb56b,#ff8a1f_55%,#d96a08)] font-display text-2xl font-extrabold tracking-[-0.02em] text-white transition-transform duration-100 ${pressed.grab ? "scale-95 shadow-[inset_0_3px_10px_rgba(0,0,0,0.3),0_0_44px_rgba(255,138,31,0.85)]" : "shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-5px_0_rgba(0,0,0,0.2),0_12px_30px_-8px_rgba(255,138,31,0.7)]"}`}
        {...hold("grab")}
      >
        Grab
      </button>
    </div>
  );
}
