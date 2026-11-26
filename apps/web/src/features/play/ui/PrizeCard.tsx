"use client";

import { motion } from "motion/react";
import { describePrize } from "@/features/cabinet/prizes/PrizeMesh";
import { sol, useChainStore } from "@/features/chain/chain.store";
import { useGameStore } from "@/stores/game.store";
import { ArcadeButton } from "./ArcadeButton";
import { LABEL } from "./hud/glass";
import { RollMeter } from "./hud/RollMeter";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The receipt for a win, shown once the prize has come out of the bin. */
export function PrizeCard() {
  const won = useGameStore((s) => s.won);
  const roll = useGameStore((s) => s.roll);
  const playAgain = useGameStore((s) => s.playAgain);
  const exit = useGameStore((s) => s.exit);
  // grabs still paid for in the round that is live onchain (null in the demo)
  const left = useChainStore((s) =>
    s.outOfGrabs ? 0 : s.status === "live" ? (s.round?.credits ?? 0) : null,
  );
  if (!won) return null;
  const info = describePrize(won);

  return (
    <motion.section
      key="prize"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 2.1, duration: 0.7, ease: EASE } }}
      exit={{ opacity: 0, y: 28, transition: { duration: 0.25 } }}
      className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:inset-y-0 md:right-0 md:left-auto md:items-center md:p-12"
    >
      <div className="panel pointer-events-auto w-full max-w-sm rounded-[28px] p-7">
        <p className={`${LABEL} !text-brass`}>{info.tier}</p>
        <h3 className="mt-2.5 font-display text-4xl leading-none font-extrabold tracking-[-0.035em] text-paper">
          {info.name}
        </h3>
        {roll && (
          <div className="mt-6 border-t border-paper/10 pt-5">
            <RollMeter value={roll.value} need={roll.need} won={roll.won} size="sm" delay={2.3} />
          </div>
        )}
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-paper/55">Payout</dt>
          <dd className="text-right text-paper">
            {roll?.proof
              ? `${sol(roll.proof.payoutLamports)} SOL, yours when you leave`
              : roll?.offline
                ? "The rollup did not answer, so this grab was not paid"
                : "Demo round, nothing at stake"}
          </dd>
          {roll?.proof && (
            <>
              <dt className="text-paper/55">Proof</dt>
              <dd className="text-right">
                <a
                  href={roll.proof.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-paper underline decoration-paper/40 underline-offset-4"
                >
                  VRF roll on the rollup
                </a>
              </dd>
            </>
          )}
        </dl>
        <div className="mt-7 flex gap-3">
          {left === 0 ? (
            <ArcadeButton className="flex-1" onClick={exit}>
              Finish and collect
            </ArcadeButton>
          ) : (
            <>
              <ArcadeButton className="flex-1" onClick={playAgain}>
                {left === null ? "Play again" : `Next grab (${left} left)`}
              </ArcadeButton>
              <ArcadeButton tone="quiet" onClick={exit}>
                {left === null ? "Leave" : "Cash out"}
              </ArcadeButton>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
