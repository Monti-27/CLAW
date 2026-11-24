"use client";

import type { CSSProperties, ReactNode } from "react";
import { forwardRef, useState } from "react";

/**
 * A small dark glass capsule. On press, glossy magenta pours in from the
 * left behind a wobbling meniscus. --p (0..1) is how full it is; it moves
 * by CSS transition, so it glides even while the page is busy.
 * Shipped with the component (React hoists and dedupes it).
 */
const CSS = String.raw`
.liquid-btn {
  --p: 0;
  --fill-ms: 1400ms;
  --fill-ease: cubic-bezier(0.65, 0, 0.35, 1);
  position: relative;
  isolation: isolate;
  border-radius: 9999px;
  background: rgb(16 9 14 / 0.42);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.16),
    inset 0 0 0 1px rgb(255 255 255 / 0.13),
    0 10px 30px -12px rgb(0 0 0 / 0.6);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  transition: box-shadow 0.5s, background-color 0.3s, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.liquid-btn:hover {
  background: rgb(16 9 14 / 0.52);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.22),
    inset 0 0 0 1px rgb(255 255 255 / 0.24),
    0 10px 30px -12px rgb(0 0 0 / 0.6);
}
.liquid-btn:active { transform: scale(0.97); }
.liquid-btn[data-pouring="true"] {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.2),
    inset 0 0 0 1px rgb(255 255 255 / 0.16),
    0 0 34px -4px rgb(240 62 160 / 0.8);
}
.liquid-clip {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}
.liquid {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 9999px 0 0 9999px;
  transform: translateX(calc((var(--p) - 1) * 100%));
  transition: transform var(--fill-ms) var(--fill-ease);
  background: linear-gradient(180deg, #ff8fd0 0%, #f24aa6 45%, #cf1f82 100%);
  box-shadow: inset 0 1px 1px rgb(255 255 255 / 0.6), inset 0 -4px 10px rgb(120 0 60 / 0.35);
}
.liquid-btn[data-full="true"] .liquid { border-radius: 9999px; }
.liquid::before {
  content: "";
  position: absolute;
  inset: 3px 4px;
  border-radius: 9999px;
  border: 1px solid rgb(255 255 255 / 0.55);
  mask-image: linear-gradient(180deg, black 0 35%, transparent 80%);
}
.liquid-label {
  position: absolute;
  inset: 0;
  transform: translateX(calc((1 - var(--p)) * 100%));
  transition: transform var(--fill-ms) var(--fill-ease);
}
.meniscus {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 26px;
  left: calc(var(--p) * 100% - 13px);
  transition: left var(--fill-ms) var(--fill-ease), opacity 0.3s;
  opacity: var(--wet, 0);
}
.meniscus::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, #ff8fd0 0%, #f24aa6 45%, #cf1f82 100%);
  box-shadow: inset -3px 0 4px rgb(255 255 255 / 0.6), 4px 0 12px rgb(255 80 170 / 0.5);
  clip-path: inset(0 0 0 50%);
  animation: meniscus 0.8s ease-in-out infinite alternate;
}
.liquid-btn[data-full="true"] .meniscus { opacity: 0; }
@keyframes meniscus {
  from { transform: scaleX(0.7) scaleY(1.03); }
  to { transform: scaleX(1.15) scaleY(0.95); }
}
.liquid-arrow { transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.liquid-btn:hover .liquid-arrow { transform: translateX(3px); }
@media (prefers-reduced-motion: reduce) { .meniscus::before { animation: none; } }
`;

type Props = {
  children: ReactNode;
  /** 0..1, how full the capsule is */
  level: number;
  /** how long the pour to `level` takes */
  ms: number;
  ease?: string;
  pouring: boolean;
  full: boolean;
  onClick?: () => void;
  onHover?: (on: boolean) => void;
  disabled?: boolean;
  size?: "md" | "sm";
  /** replaces the trailing arrow */
  icon?: ReactNode;
  className?: string;
  "aria-expanded"?: boolean;
};

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="liquid-arrow size-4 opacity-80" fill="none" aria-hidden="true">
    <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Label = ({ children, icon, sm }: { children: ReactNode; icon?: ReactNode; sm: boolean }) => (
  <span
    className={`flex h-full items-center justify-center pr-1 pl-1 font-sans font-medium tracking-[-0.012em] ${sm ? "gap-2 text-[13px]" : "gap-2.5 text-[15px]"}`}
  >
    {children}
    {icon === undefined ? <Arrow /> : icon}
  </span>
);

export const LiquidButton = forwardRef<HTMLButtonElement, Props>(function LiquidButton(
  { children, level, ms, ease, pouring, full, onClick, onHover, disabled, size = "md", icon, className = "", ...aria },
  ref,
) {
  return (
    <>
      <style href="claw-liquid-btn" precedence="default">
        {CSS}
      </style>
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onPointerEnter={() => onHover?.(true)}
        onPointerLeave={() => onHover?.(false)}
        disabled={disabled}
        data-pouring={pouring}
        data-full={full}
        {...aria}
        className={`liquid-btn pointer-events-auto select-none text-white outline-offset-4 disabled:cursor-default ${size === "sm" ? "h-10 px-5" : "h-12 px-7"} ${className}`}
        style={
          {
            "--p": level,
            "--wet": level > 0.005 ? 1 : 0,
            "--fill-ms": `${ms}ms`,
            ...(ease ? { "--fill-ease": ease } : {}),
          } as CSSProperties
        }
      >
        <Label icon={icon} sm={size === "sm"}>
          {children}
        </Label>
        <span className="liquid-clip" aria-hidden="true">
          <span className="liquid">
            <span className="liquid-label text-[#3d0626]">
              <Label icon={icon} sm={size === "sm"}>
                {children}
              </Label>
            </span>
          </span>
          <span className="meniscus" />
        </span>
      </button>
    </>
  );
});

/**
 * The capsule as an everyday button: liquid pours all the way in on hover
 * (and drains out on leave), so every action in the game shares one gesture.
 */
export function PourButton({
  children,
  onClick,
  icon,
  size = "sm",
  className,
  "aria-expanded": expanded,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  size?: "md" | "sm";
  className?: string;
  "aria-expanded"?: boolean;
}) {
  const [on, setOn] = useState(false);
  return (
    <LiquidButton
      level={on ? 1 : 0}
      ms={on ? 520 : 420}
      ease={on ? "cubic-bezier(0.3, 0.7, 0.2, 1)" : "cubic-bezier(0.4, 0, 0.6, 1)"}
      pouring={on}
      full={false}
      onClick={onClick}
      onHover={setOn}
      size={size}
      icon={icon}
      className={className}
      aria-expanded={expanded}
    >
      {children}
    </LiquidButton>
  );
}
