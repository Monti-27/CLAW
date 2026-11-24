"use client";

import type { ButtonHTMLAttributes, CSSProperties, PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary: lacquered pink. glass: clear, for light or busy backgrounds. quiet: frosted panel. */
  tone?: "primary" | "glass" | "quiet";
  size?: "md" | "lg";
  /** optional icon, shown in a round well at the end of the pill */
  icon?: ReactNode;
};

const TONES = {
  primary: {
    shell:
      "text-white bg-[linear-gradient(180deg,#ff7fb6_0%,#ec4b93_48%,#c8336f_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(110,10,55,0.35),0_3px_0_#8e1d52,0_22px_46px_-16px_rgba(232,71,143,0.95)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(110,10,55,0.35),0_5px_0_#8e1d52,0_28px_56px_-16px_rgba(232,71,143,1)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_0_#8e1d52,0_10px_24px_-12px_rgba(232,71,143,0.8)]",
    flow: { "--fx-a": "rgb(255 220 236 / 0.55)", "--fx-b": "rgb(255 150 200 / 0.6)" },
    well: "bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_0_0_1px_rgba(255,255,255,0.18)]",
  },
  glass: {
    shell:
      "text-white bg-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_0_0_1px_rgba(255,255,255,0.14),0_20px_50px_-18px_rgba(12,7,15,0.8)] hover:bg-white/[0.12]",
    flow: { "--fx-a": "rgb(255 92 160 / 0.6)", "--fx-b": "rgb(255 205 228 / 0.4)" },
    well: "bg-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]",
  },
} as const;

/** Spotlight follows the pointer across the pill. */
const track = (e: PointerEvent<HTMLButtonElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

/**
 * The button system. Primary and glass are effect buttons: a light runs
 * round the rim, a soft glow drifts inside behind fluted glass, and a
 * spotlight follows the pointer. Quiet is a plain frosted pill.
 */
export function ArcadeButton({ tone = "primary", size = "md", icon, className, children, onPointerMove, ...rest }: Props) {
  const lg = size === "lg";
  const fx = tone !== "quiet";
  const t = fx ? TONES[tone] : null;
  return (
    <button
      type="button"
      onPointerMove={(e) => {
        if (fx) track(e);
        onPointerMove?.(e);
      }}
      className={cn(
        "group pointer-events-auto relative inline-flex shrink-0 select-none items-center whitespace-nowrap justify-center rounded-full font-display font-semibold tracking-[-0.02em] outline-offset-4 transition-[transform,box-shadow,background-color,filter] duration-300 ease-out-expo disabled:opacity-60",
        lg ? "h-[60px] text-[1.1875rem]" : "h-12 text-[15px]",
        icon ? (lg ? "gap-6 pr-2 pl-8" : "gap-4 pr-1.5 pl-5") : lg ? "px-9" : "px-6",
        fx
          ? cn("fx-btn hover:-translate-y-0.5 active:translate-y-[2px] active:scale-[0.985]", t?.shell)
          : "panel text-paper/90 hover:bg-paper/10 hover:text-paper active:scale-[0.98]",
        className,
      )}
      {...rest}
    >
      {fx && (
        <>
          <span className="fx-flow" style={t?.flow as CSSProperties} aria-hidden="true" />
          <span className="fx-flutes" aria-hidden="true" />
          <span className="fx-spot" aria-hidden="true" />
        </>
      )}
      <span className="relative">{children}</span>
      {icon && (
        <span
          className={cn(
            "relative grid place-items-center rounded-full transition-transform duration-500 ease-out-expo group-hover:translate-x-1",
            lg ? "size-11" : "size-9",
            t?.well ?? "bg-paper/10",
          )}
        >
          {icon}
        </span>
      )}
    </button>
  );
}

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="size-[42%] translate-x-[1px]" aria-hidden="true">
    <path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z" fill="currentColor" />
  </svg>
);

export const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="size-[42%]" fill="none" aria-hidden="true">
    <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
