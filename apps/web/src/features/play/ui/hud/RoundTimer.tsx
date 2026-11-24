"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ROUND_SECONDS, useGameStore } from "@/stores/game.store";
import { FIGURE, GLASS, LABEL } from "./glass";

const EASE = [0.16, 1, 0.3, 1] as const;
const R = 16.5;
/** one dot per second, laid round the dial like the claw mark's ring */
const DOTS = Array.from({ length: ROUND_SECONDS }, (_, i) => {
  const a = (i / ROUND_SECONDS) * Math.PI * 2;
  return { x: 22 + Math.sin(a) * R, y: 22 - Math.cos(a) * R };
});
const LIT = "#ff8fc0";
const HOT = "#ff5f7e";
const SPENT = "rgba(255,245,238,0.13)";

/**
 * Round clock. A ring of thirty dots drains clockwise, the second in progress
 * fading out as it goes; the figure rolls over each second. The last five
 * seconds run hot. Between rounds the dial rests and says what's happening.
 */
export function RoundTimer() {
  const phase = useGameStore((s) => s.phase);
  const seconds = useGameStore((s) => Math.ceil(s.timeLeft));
  const ring = useRef<SVGGElement>(null);
  const live = phase === "playing";
  const urgent = live && seconds <= 5;

  // the dots follow the exact time, outside React, so the drain is smooth
  useEffect(() => {
    const paint = (left: number, hot: boolean) => {
      const g = ring.current;
      if (!g) return;
      const dots = g.children;
      for (let i = 0; i < dots.length; i++) {
        const c = dots[i] as SVGCircleElement;
        // dot i stands for the second that ends at i + 1 left on the clock
        const k = Math.min(1, Math.max(0, left - i));
        c.style.fill = k > 0 ? (hot ? HOT : LIT) : SPENT;
        c.style.opacity = k > 0 ? String(0.25 + 0.75 * k) : "1";
        c.setAttribute("r", k > 0 ? String(1.2 + 0.35 * k) : "0.95");
      }
    };
    const s = useGameStore.getState();
    paint(s.timeLeft, s.phase === "playing" && s.timeLeft <= 5);
    return useGameStore.subscribe((st) => paint(st.timeLeft, st.phase === "playing" && st.timeLeft <= 5));
  }, []);

  const status =
    phase === "intro" ? "Get ready" : phase === "grabbing" ? "Grabbing" : phase === "playing" ? "Time" : "Round over";

  return (
    <div className={`relative flex h-12 items-center gap-2.5 rounded-full pr-5 pl-1.5 ${GLASS}`} aria-live="off">
      <div className="relative size-10">
        {/* a pulse off the dial each of the last five seconds */}
        <AnimatePresence>
          {urgent && (
            <motion.span
              key={seconds}
              className="absolute inset-0 rounded-full border border-[#ff5f7e]"
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        <svg viewBox="0 0 44 44" className="size-10" aria-hidden="true">
          <g ref={ring}>
            {DOTS.map((d) => (
              <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={1.1} />
            ))}
          </g>
          {/* hub: the prize dot from the mark, breathing while the clock runs */}
          <motion.circle
            cx={22}
            cy={22}
            r={4.2}
            fill={urgent ? HOT : live ? LIT : "rgba(255,245,238,0.28)"}
            animate={live ? { scale: [1, 0.78, 1] } : { scale: 1 }}
            transition={live ? { duration: urgent ? 0.5 : 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } : { duration: 0.3 }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <span className={LABEL}>{status}</span>
        <span
          className={`flex items-baseline text-[22px] leading-none transition-colors duration-300 ${FIGURE} ${
            urgent ? "text-[#ff8fa5]" : live ? "text-paper" : "text-paper/55"
          }`}
        >
          <span className="relative inline-flex overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={seconds}
                initial={{ y: "-85%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "85%", opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="inline-block w-[1.3em]"
              >
                {String(Math.max(0, seconds)).padStart(2, "0")}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="ml-0.5 text-[12px] font-medium tracking-normal text-current opacity-50">s</span>
        </span>
      </div>
    </div>
  );
}
