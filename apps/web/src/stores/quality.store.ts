import { create } from "zustand";
import { PROFILES, type Profile, type Tier } from "@/lib/quality";

export type LoadStep = "engine" | "building" | "compiling" | "ready";

type QualityStore = {
  tier: Tier;
  profile: Profile;
  /** false once the device proved too slow; post-processing is dropped */
  post: boolean;
  step: LoadStep;
  /** the player has walked in from the boot screen (also unlocks audio) */
  entered: boolean;
  enter: () => void;
  /** the dive into the arcade has started: the scene starts rendering behind it */
  entering: boolean;
  startEntering: () => void;
  setTier: (tier: Tier) => void;
  dropPost: () => void;
  setStep: (step: LoadStep) => void;
};

export const useQualityStore = create<QualityStore>()((set) => ({
  tier: "mid",
  profile: PROFILES.mid,
  post: PROFILES.mid.post,
  step: "engine",
  entered: false,
  enter: () => set({ entered: true, entering: true }),
  entering: false,
  startEntering: () => set({ entering: true }),
  setTier: (tier) => {
    document.documentElement.dataset.tier = tier;
    set({ tier, profile: PROFILES[tier], post: PROFILES[tier].post });
  },
  dropPost: () => set({ post: false }),
  setStep: (step) => set({ step }),
}));
