"use client";

import Image from "next/image";
import { useChainStore } from "@/features/chain/chain.store";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

/** Header lockup. */
export function Brand() {
  return <Logo />;
}

const MODE: Partial<Record<string, string>> = {
  off: "Demo",
  "no-wallet": "Demo",
  "no-machine": "Demo",
  checking: "Checking",
  opening: "Opening",
  live: "Live",
  settling: "Settling",
};

/** Where the game runs: the network, and a short mode tag when it isn't simply ready. */
export function NetworkPill() {
  const status = useChainStore((s) => s.status);
  const mode = MODE[status];
  return (
    <div className="panel flex h-10 items-center gap-2.5 rounded-full px-4">
      <span className="text-[13px] font-medium tracking-[-0.01em] text-paper/90">Solana Devnet</span>
      {mode && (
        <>
          <span className="h-3.5 w-px bg-paper/15" />
          <span className="eyebrow text-paper/50">{mode}</span>
        </>
      )}
    </div>
  );
}

export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-paper/55 ${className}`}>
      <span className="text-[12px] tracking-[0.01em]">Powered by</span>
      <Image
        src="/brand/magicblock.png"
        alt=""
        width={18}
        height={18}
        className="size-[18px] rounded-[5px]"
      />
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-paper/85">MagicBlock</span>
    </div>
  );
}

/**
 * Where the game runs, as a readout rather than a button: the Solana glyph,
 * the cluster, and a separate DEMO tag while there's no wallet. No pill, so
 * it reads as part of the scene's HUD next to the real controls.
 */
export function NetworkStatus() {
  const status = useChainStore((s) => s.status);
  const mode = MODE[status];
  return (
    <div className="flex items-center gap-3 pr-1">
      <div className="flex items-center gap-2 [text-shadow:0_1px_12px_rgba(12,7,15,0.8)]">
        <svg viewBox="0 0 24 24" className="size-3.5 text-[#ff8fc0]" fill="currentColor" aria-hidden="true">
          <path d="M5 6.5h12.6a.6.6 0 0 1 .42 1.03L16.5 9H3.9a.6.6 0 0 1-.42-1.03zM5 14.5h12.6a.6.6 0 0 0 .42-1.03L16.5 12H3.9a.6.6 0 0 0-.42 1.03zM5 17.5h12.6a.6.6 0 0 1 .42 1.03L16.5 20H3.9a.6.6 0 0 1-.42-1.03z" />
        </svg>
        <span className="text-[13px] font-medium tracking-[-0.01em] text-paper/85">Devnet</span>
      </div>
      {mode && (
        <span className="rounded-md border border-[#ff8fc0]/35 bg-[#ff8fc0]/[0.08] px-1.5 py-[3px] font-mono text-[10px] leading-none tracking-[0.14em] text-[#ffb3d6] uppercase">
          {mode}
        </span>
      )}
    </div>
  );
}
