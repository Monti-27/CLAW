"use client";

import { motion } from "motion/react";
import { useChainStore } from "@/features/chain/chain.store";
import { ChainNote } from "@/features/chain/ui/ChainNote";
import { WalletButton } from "@/features/chain/ui/WalletButton";
import { usePlay } from "@/features/chain/usePlay";
import { ArcadeButton, PlayIcon } from "./ArcadeButton";
import { Brand, NetworkStatus, PoweredBy } from "./brand/Brand";
import { MuteButton } from "./MuteButton";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Staggered rise for each block, timed to land as the camera finishes its fly-in. */
const rise = (i: number) => ({
  initial: { opacity: 0, y: 18, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 1, delay: 0.5 + i * 0.09, ease: EASE },
});

/** Title card over the slowly turning machine. */
export function AttractScreen() {
  // opens a round onchain when a wallet is connected, the local demo otherwise
  const { play, collect, busy } = usePlay();
  const chainOn = useChainStore((s) => s.status !== "off");

  return (
    <motion.section
      key="attract"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className="pointer-events-none absolute inset-0 flex flex-col p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8 lg:px-12 lg:py-10"
    >
      {/* keeps the type readable over any part of the hall without boxing it in */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(65%_70%_at_0%_100%,rgba(12,7,15,0.72),transparent_72%)]" />

      <motion.header {...rise(0)} className="flex items-center justify-between">
        <Brand />
        <div className="pointer-events-auto flex items-center gap-3">
          <NetworkStatus />
          {chainOn && <WalletButton segment />}
          <MuteButton />
        </div>
      </motion.header>

      <div className="flex-1" />

      <div className="flex max-w-[30rem] flex-col items-center gap-6 self-center text-center md:items-start md:self-start md:text-left">
        <motion.h1
          {...rise(1)}
          className="font-display text-[clamp(3.25rem,6.2vw,5.75rem)] leading-[0.9] font-semibold tracking-[-0.06em] text-paper"
        >
          Grab it.
          <br />
          <span className="font-serif text-[1.08em] font-normal tracking-[-0.03em] text-[#ff8fc0] italic">Own it.</span>
        </motion.h1>

        <motion.p {...rise(2)} className="max-w-[32ch] text-base leading-[1.55] tracking-[-0.01em] text-paper/62">
          A claw machine that can&apos;t be rigged. Every move runs on a MagicBlock rollup and every
          grip is a random roll anyone can verify.
        </motion.p>

        <motion.div {...rise(3)} className="flex flex-col items-center gap-4 md:items-start">
          <ArcadeButton size="lg" onClick={play} disabled={busy} autoFocus icon={<PlayIcon />}>
            {busy ? "One sec" : "Play"}
          </ArcadeButton>
          <ChainNote onCollect={collect} />
        </motion.div>
      </div>

      <motion.footer {...rise(4)} className="mt-10 hidden justify-end md:flex">
        <PoweredBy />
      </motion.footer>
    </motion.section>
  );
}
