"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useChainStore } from "@/features/chain/chain.store";
import { useGameStore } from "@/stores/game.store";
import { FIGURE, GLASS, LABEL } from "./glass";
import { Ticker } from "./Ticker";

function Cell({ label, value, accent = false, flash = 0 }: { label: string; value: number; accent?: boolean; flash?: number }) {
  return (
    <div className="relative flex flex-col items-start gap-1 px-4">
      <span className={LABEL}>{label}</span>
      <span className={`text-[19px] leading-none ${FIGURE} ${accent ? "text-[#ff8fc0]" : "text-paper"}`}>
        <Ticker value={value} />
      </span>
      {flash > 0 && (
        <motion.span
          key={flash}
          className="pointer-events-none absolute inset-x-1 -inset-y-2 rounded-xl bg-[radial-gradient(closest-side,rgba(255,143,192,0.45),transparent)]"
          initial={{ opacity: 1, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

const Divider = () => <span className="h-6 w-px bg-paper/10" />;

/**
 * Session tally as a scoreboard: plays and wins side by side, figures rolling
 * over when they change, a pink flare when a win lands. Onchain rounds add the
 * credits left and the moves sent to the rollup.
 */
export function Scoreboard() {
  const plays = useGameStore((s) => s.plays);
  const wins = useGameStore((s) => s.wins);
  const credits = useChainStore((s) => (s.status === "live" ? (s.round?.credits ?? 0) : null));
  const moves = useChainStore((s) => s.movesSent);

  // flare on a new win
  const last = useRef(wins);
  const [flare, setFlare] = useState(0);
  useEffect(() => {
    if (wins > last.current) setFlare((n) => n + 1);
    last.current = wins;
  }, [wins]);

  return (
    <div className={`flex h-12 items-center rounded-full px-1 ${GLASS}`}>
      <Cell label="Plays" value={plays} />
      <Divider />
      <Cell label="Wins" value={wins} accent={wins > 0} flash={flare} />
      {credits !== null && (
        <>
          <Divider />
          <Cell label="Credits" value={credits} />
          <Divider />
          <Cell label="Rollup tx" value={moves} />
        </>
      )}
    </div>
  );
}
