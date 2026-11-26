"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useGameStore } from "@/stores/game.store";
import { useChainStore } from "./chain.store";
import { claim, openRound, refresh } from "./session";

/**
 * What the Play button does. With a wallet connected and the machine live on
 * devnet it opens a round onchain first; otherwise it starts the local demo.
 */
export function usePlay() {
  const { publicKey, signTransaction } = useWallet();
  const start = useGameStore((s) => s.start);
  const status = useChainStore((s) => s.status);
  const busy = status === "opening" || status === "settling";
  const player = publicKey && signTransaction ? { publicKey, signTransaction } : null;

  const play = async () => {
    if (busy) return;
    // pressed Play before the lookup finished: finish it, so a connected wallet never lands in the demo
    if (status === "checking" && player) await refresh(player.publicKey);
    if (useChainStore.getState().status !== "ready" || !player) return start();
    try {
      await openRound(player);
      start();
    } catch {
      // openRound has already put the reason in the store for the title screen
    }
  };

  const collect = async () => {
    if (player && !busy) await claim(player);
  };

  return { play, collect, busy, onchain: status === "ready" || status === "live" };
}
