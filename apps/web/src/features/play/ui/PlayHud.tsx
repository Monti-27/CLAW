"use client";

import { motion } from "motion/react";
import { useGameStore } from "@/stores/game.store";
import { GLASS } from "./hud/glass";
import { RollMeter } from "./hud/RollMeter";
import { RoundTimer } from "./hud/RoundTimer";
import { Scoreboard } from "./hud/Scoreboard";
import { MuteButton } from "./MuteButton";
import { TouchPad } from "./TouchPad";

/** A keycap, for the controls hint. */
const Key = ({ children, wide = false }: { children: string; wide?: boolean }) => (
  <kbd
    className={`inline-grid h-[22px] place-items-center rounded-[6px] bg-paper/[0.08] font-sans text-[11px] font-semibold text-paper/85 shadow-[inset_0_-1px_0_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.1)] ${
      wide ? "px-2" : "w-[22px]"
    }`}
  >
    {children}
  </kbd>
);

/** Timer, score and hints while a round is live. */
export function PlayHud() {
  const phase = useGameStore((s) => s.phase);
  const roll = useGameStore((s) => s.roll);
  const exit = useGameStore((s) => s.exit);

  return (
    <motion.div
      key="hud"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none absolute inset-0"
    >
      <div className="relative flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exit}
            className={`pointer-events-auto flex h-10 items-center gap-2 rounded-full pr-5 pl-4 text-[13px] font-semibold tracking-[-0.01em] text-paper/85 transition-colors hover:text-paper ${GLASS}`}
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M9.5 3.5 5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Leave
          </button>
          <MuteButton />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 max-md:top-[max(4.25rem,calc(env(safe-area-inset-top)+3.25rem))] md:top-7">
          <RoundTimer />
        </div>

        <Scoreboard />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {phase === "grabbing" && (
          <motion.div
            layout
            className={`flex flex-col items-center gap-3 rounded-[22px] px-5 py-3.5 ${GLASS}`}
            transition={{ layout: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
          >
            {roll && roll.need > 0 ? (
              <RollMeter value={roll.value} need={roll.need} won={roll.won} size="sm" />
            ) : roll ? (
              <span className="text-[13px] text-paper/60">Nothing under the claw</span>
            ) : (
              <span className="flex items-center gap-2.5 text-[13px] text-paper/75">
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-[#ff8fc0]"
                      animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
                    />
                  ))}
                </span>
                Rolling the grip on the rollup
              </span>
            )}
          </motion.div>
        )}
        {phase === "playing" && (
          <p className={`hidden h-9 items-center gap-2 rounded-full px-4 text-[12.5px] text-paper/65 pointer-fine:flex ${GLASS}`}>
            Click the machine’s buttons, or use
            <Key>←</Key><Key>↑</Key><Key>→</Key><Key>↓</Key>
            and
            <Key wide>Space</Key>
          </p>
        )}
        {(phase === "playing" || phase === "intro") && <TouchPad />}
      </div>
    </motion.div>
  );
}
