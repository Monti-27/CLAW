"use client";

import { motion } from "motion/react";
import { describePrize } from "@/features/cabinet/prizes/PrizeMesh";
import { useGameStore } from "@/stores/game.store";
import { GLASS, LABEL } from "./hud/glass";
import { RollMeter } from "./hud/RollMeter";

const EASE = [0.16, 1, 0.3, 1] as const;

const COPY = {
  win: { lead: "It’s", tail: "yours.", tag: "Win", note: "Held all the way to the chute." },
  miss: { lead: "It", tail: "slipped.", tag: "Slipped", note: "The roll landed past the hold chance." },
  empty: { lead: "Nothing", tail: "there.", tag: "Empty grab", note: "The fingers closed on air. Line up over a prize." },
} as const;

/** One word, rising out of its own mask. */
function Word({ children, delay, className }: { children: string; delay: number; className: string }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
      <motion.span
        className={`inline-block ${className}`}
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.85, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/**
 * The verdict, set as a lower third so it never covers the machine: a tag
 * naming what happened and to what, the line in the attract screen's two
 * voices, and the roll that decided it on its scale.
 */
export function ResultBanner() {
  const phase = useGameStore((s) => s.phase);
  const roll = useGameStore((s) => s.roll);
  const prize = useGameStore((s) => (s.phase === "celebrate" ? s.won : s.missed));
  const won = phase === "celebrate";
  const aimed = (roll?.need ?? 0) > 0;
  const kind = won ? "win" : aimed ? "miss" : "empty";
  const copy = COPY[kind];
  const name = prize ? describePrize(prize).name : null;

  return (
    <motion.div
      key={`verdict-${phase}`}
      className="pointer-events-none absolute inset-x-0 bottom-0 isolate flex flex-col items-center px-6 pt-44 pb-[max(2.25rem,env(safe-area-inset-bottom))] text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      {/* scrim so the type reads over any part of the scene */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(12_7_15/0.88),rgb(12_7_15/0.5)_42%,transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className={`flex h-8 items-center gap-2.5 rounded-full pr-4 pl-3 ${GLASS}`}
      >
        <span
          className={`size-2 rounded-full ${
            kind === "win"
              ? "bg-[#ff8fc0] shadow-[0_0_10px_2px_rgba(255,143,192,0.7)]"
              : kind === "miss"
                ? "bg-paper/55"
                : "border border-paper/45"
          }`}
        />
        <span className={`${LABEL} !text-paper/80`}>{copy.tag}</span>
        {name && kind !== "empty" && (
          <>
            <span className="h-3 w-px bg-paper/15" />
            <span className="text-[12px] font-medium tracking-[-0.01em] text-paper/70">{name}</span>
          </>
        )}
      </motion.div>

      <h2 className="mt-5 font-display text-[clamp(3rem,7.2vw,5.75rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-paper [text-shadow:0_2px_30px_rgba(12,7,15,0.5)]">
        <Word delay={0.08} className="">
          {copy.lead}
        </Word>{" "}
        <Word
          delay={0.2}
          className={`font-serif text-[1.08em] font-normal tracking-[-0.03em] italic ${
            kind === "win" ? "text-[#ff8fc0]" : "text-paper/85"
          }`}
        >
          {copy.tail}
        </Word>
      </h2>

      {roll && aimed ? (
        <motion.div
          className="mt-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
        >
          <RollMeter value={roll.value} need={roll.need} won={roll.won} delay={0.3} />
          <p className="mt-4 text-[12.5px] tracking-[-0.005em] text-paper/50">
            {copy.note}{" "}
            {roll.proof ? (
              <a
                href={roll.proof.url}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto text-paper/80 underline decoration-paper/30 underline-offset-4 hover:text-paper"
              >
                Verify the VRF roll
              </a>
            ) : (
              <span className="text-paper/35">{roll.offline ? "Rolled locally, rollup offline." : "Demo roll."}</span>
            )}
          </p>
        </motion.div>
      ) : (
        <motion.p
          className="mt-5 text-[13px] text-paper/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {copy.note}
        </motion.p>
      )}
    </motion.div>
  );
}
