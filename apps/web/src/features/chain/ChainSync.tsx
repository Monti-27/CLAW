"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useClawStore } from "@/stores/claw.store";
import { useGameStore } from "@/stores/game.store";
import { useChainStore } from "./chain.store";
import { MOVE_INTERVAL_MS } from "./config";
import { closeRound, pushMove, refresh } from "./session";

/**
 * Keeps the onchain round in step with the game. Renders nothing.
 *  - wallet connects or changes: look up the machine and the player's round
 *  - player steers: stream the claw position to the rollup
 *  - player leaves, or runs out of credits: settle back to Solana
 */
export function ChainSync() {
  const { publicKey } = useWallet();

  useEffect(() => {
    void refresh(publicKey ?? null);
  }, [publicKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (useGameStore.getState().phase !== "playing") return;
      const claw = useClawStore.getState().claws.p1;
      if (claw.phase === "idle") pushMove(claw.x, claw.z);
    }, MOVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () =>
      useGameStore.subscribe((game, before) => {
        if (game.phase === before.phase) return;
        const chain = useChainStore.getState();
        // paid grabs are used up: never slide into free play, go back to the title
        if (chain.outOfGrabs) {
          if (game.phase === "intro") queueMicrotask(() => useGameStore.getState().exit());
          if (game.phase === "attract") chain.set({ outOfGrabs: false });
          return;
        }
        if (chain.status !== "live") return;
        if (game.phase === "attract") void closeRound();
        // last grab is decided: start settling under the result screen, so the title is ready sooner
        if (
          (game.phase === "lost" || game.phase === "celebrate") &&
          (chain.round?.credits ?? 0) === 0
        ) {
          chain.set({ outOfGrabs: true });
          void closeRound();
        }
        // out of credits: back to the title, which settles the round
        if (game.phase === "intro" && (chain.round?.credits ?? 0) === 0) {
          queueMicrotask(() => useGameStore.getState().exit());
        }
      }),
    [],
  );

  return null;
}
