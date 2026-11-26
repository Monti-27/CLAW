"use client";

import { type ChainStatus as Status, useChainStore } from "../chain.store";
import { WalletButton } from "./WalletButton";

const LABEL: Record<Status, string> = {
  off: "Demo mode",
  checking: "Checking devnet",
  "no-wallet": "Demo mode",
  "no-machine": "Machine not found on devnet",
  ready: "Solana devnet, MagicBlock rollup",
  opening: "Opening your round",
  live: "Live on the rollup",
  settling: "Settling on Solana",
};

/** Header corner of the title screen: where the game is running, and the wallet. */
export function ChainStatus() {
  const status = useChainStore((s) => s.status);
  return (
    <>
      <span className="hidden text-sm text-paper/55 sm:inline">{LABEL[status]}</span>
      {status !== "off" && <WalletButton />}
    </>
  );
}
