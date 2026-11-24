"use client";

import { motion } from "motion/react";

/**
 * The claw mark: an open ring of dots (the claw, open at the bottom)
 * cradling one larger dot (the prize). Dots grow toward the opening, so
 * the mark reads as fingers reaching down.
 */
const CENTER = { x: 16, y: 14.5 };
const R = 10.6;
const DOTS = [
  { a: -128, r: 2.7 },
  { a: -86, r: 2.3 },
  { a: -43, r: 1.95 },
  { a: 0, r: 1.7 },
  { a: 43, r: 1.95 },
  { a: 86, r: 2.3 },
  { a: 128, r: 2.7 },
];
const PRIZE = { x: 16, y: 21.2, r: 3.9 };

const at = (deg: number, radius: number) => {
  const t = (deg * Math.PI) / 180;
  return { x: CENTER.x + Math.sin(t) * radius, y: CENTER.y - Math.cos(t) * radius };
};

const EASE = [0.16, 1, 0.3, 1] as const;

const CSS = String.raw`/*
 * The claw mark breathing: a swell runs round the ring clockwise, like a
 * second hand, while the prize shrinks a touch as each dot peaks.
 */
.mark-dot {
  transform-box: fill-box;
  transform-origin: center;
  animation: mark-wave 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.mark-prize {
  transform-box: fill-box;
  transform-origin: center;
  animation: mark-prize 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes mark-wave {
  0%, 100% { transform: scale(0.62); }
  18% { transform: scale(1.18); }
  42% { transform: scale(0.62); }
}
@keyframes mark-prize {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.84); }
}

@media (prefers-reduced-motion: reduce) { .mark-dot, .mark-prize { animation: none; } }`;

type MarkState = "hidden" | "open" | "grab";

/**
 * The mark, optionally animated: "hidden" → "open" assembles it dot by
 * dot; "grab" closes the claw around the prize.
 */
export function ClawMark({
  className = "size-8",
  state = "open",
  animated = false,
  breathing = false,
}: {
  className?: string;
  state?: MarkState;
  animated?: boolean;
  /** a swell runs round the ring clockwise, forever */
  breathing?: boolean;
}) {
  const wave = (i: number) =>
    breathing ? { className: "mark-dot", style: { animationDelay: `${(i / DOTS.length) * 2.4 - 2.4}s` } } : {};
  return (
    <>
    {breathing && (
      <style href="claw-mark" precedence="default">
        {CSS}
      </style>
    )}
    {/* cropped to the dots (with room for the swell) so the mark can sit on a text baseline like a letter */}
    <svg viewBox="4.3 1.6 23.4 24" overflow="visible" className={className} fill="currentColor" aria-hidden="true">
      {DOTS.map((d, i) => {
        const open = at(d.a, R);
        const grab = at(d.a * 0.72, R * 0.74);
        const from = at(d.a * 1.25, R * 1.5);
        const target = state === "grab" ? grab : state === "hidden" ? from : open;
        return animated ? (
          <g key={d.a} {...wave(i)}>
          <motion.circle
            initial={{ cx: from.x, cy: from.y, r: 0 }}
            animate={{
              cx: target.x,
              cy: target.y,
              r: state === "hidden" ? 0 : d.r,
            }}
            transition={{
              duration: state === "grab" ? 0.55 : 1.1,
              delay: state === "open" ? 0.25 + Math.abs(i - 3) * 0.07 : 0,
              ease: EASE,
            }}
          />
          </g>
        ) : (
          <g key={d.a} {...wave(i)}>
            <circle cx={open.x} cy={open.y} r={d.r} />
          </g>
        );
      })}
      <g className={breathing ? "mark-prize" : undefined}>
      {animated ? (
        <motion.circle
          cx={PRIZE.x}
          initial={{ cy: PRIZE.y + 6, r: 0 }}
          animate={{
            cy: state === "grab" ? PRIZE.y - 3.5 : PRIZE.y,
            r: state === "hidden" ? 0 : PRIZE.r,
          }}
          transition={{ duration: state === "grab" ? 0.6 : 1, delay: state === "open" ? 0.75 : 0.05, ease: EASE }}
        />
      ) : (
        <circle cx={PRIZE.x} cy={PRIZE.y} r={PRIZE.r} />
      )}
      </g>
    </svg>
    </>
  );
}

/**
 * Sizing for a mark set inline with the wordmark: as tall as the "l", its
 * bottom on the baseline, a letter's width of air before the text. Use it
 * inside an items-baseline flex row at the wordmark's font size.
 */
export const MARK_INLINE = "h-[0.74em] w-auto shrink-0 mr-[0.2em] translate-y-[0.01em]";

/** Mark plus wordmark, the one lockup used everywhere. */
export function Logo({ className = "text-[1.6rem]" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-display leading-none font-semibold tracking-[-0.06em] text-paper ${className}`}
    >
      <ClawMark className={MARK_INLINE} breathing />
      claw
    </span>
  );
}
