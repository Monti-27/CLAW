"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { SoundDirector } from "@/features/audio/SoundDirector";
import { ChainSync } from "@/features/chain/ChainSync";
import { useKeyboardControls } from "@/features/controls/useKeyboardControls";
import { ClawSceneLazy } from "@/features/scene/ClawSceneLazy";
import { detectTier } from "@/lib/quality";
import { useGameStore } from "@/stores/game.store";
import { useQualityStore } from "@/stores/quality.store";
import { AttractScreen } from "./ui/AttractScreen";
import { BootScreen } from "./ui/BootScreen";
import { PlayHud } from "./ui/PlayHud";
import { PrizeCard } from "./ui/PrizeCard";
import { ResultBanner } from "./ui/ResultBanner";

type Gpu = "checking" | "ok" | "unsupported";

export function PlayClient() {
  useKeyboardControls();
  const phase = useGameStore((s) => s.phase);
  const entered = useQualityStore((s) => s.entered);
  const [gpu, setGpu] = useState<Gpu>("checking");
  const inRound =
    phase === "intro" || phase === "playing" || phase === "grabbing" || phase === "lost";

  useEffect(() => {
    // the tier has to be known before the canvas is created (shadows, antialias)
    const tier = detectTier();
    if (!tier) return setGpu("unsupported");
    useQualityStore.getState().setTier(tier);
    // let the logo reveal play on an idle main thread, then start loading and building the scene
    const t = setTimeout(() => setGpu("ok"), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="relative h-dvh w-full touch-none overflow-hidden bg-void text-white select-none">
      {/*
        No CSS transform on this wrapper, ever: the canvas sizes itself from its container's
        bounding box, so a scale here gets baked into the canvas size. The push-in on entering
        is the camera's own fly-in.
      */}
      <div className="absolute inset-0">{gpu === "ok" && <ClawSceneLazy />}</div>
      <SoundDirector />
      <ChainSync />

      <AnimatePresence>
        {entered && phase === "attract" && <AttractScreen key="attract" />}
        {inRound && <PlayHud key="hud" />}
        {(phase === "lost" || phase === "celebrate") && <ResultBanner key={`banner-${phase}`} />}
        {phase === "prize" && <PrizeCard key="prize" />}
      </AnimatePresence>

      <BootScreen unsupported={gpu === "unsupported"} />
    </main>
  );
}
