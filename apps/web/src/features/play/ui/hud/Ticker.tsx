"use client";

import { AnimatePresence, motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A number that rolls like an odometer: each digit slides out and the new
 * one slides in, only the digits that changed.
 */
export function Ticker({ value, digits = 2, className = "" }: { value: number; digits?: number; className?: string }) {
  const text = String(Math.max(0, Math.floor(value))).padStart(digits, "0");
  return (
    <span className={`inline-flex overflow-hidden ${className}`} aria-label={String(value)}>
      {text.split("").map((d, i) => (
        // keyed by place, so only changed places animate
        // biome-ignore lint/suspicious/noArrayIndexKey: digit places are stable
        <span key={i} className="relative inline-block w-[0.62em] text-center">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={d}
              className="inline-block"
              initial={{ y: "-90%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "90%", opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
