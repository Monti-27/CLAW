import { create } from "zustand";
import { generatePile, type PlacedPrize } from "@/features/cabinet/prizes/layout";

/**
 * attract   idle machine, slow sway, Play button
 * intro     camera flies down to the player's station
 * playing   player steers with the deck buttons, timer running
 * grabbing  claw drops, camera pulls back to watch
 * lost      the prize slipped; short beat, then back to playing
 * celebrate win: chaser bulbs, beams, confetti, camera arc
 * prize     camera dives to the prize bin, prize comes out
 */
export type GamePhase =
  | "attract"
  | "intro"
  | "playing"
  | "grabbing"
  | "lost"
  | "celebrate"
  | "prize";

export type GripRoll = {
  value: number;
  need: number;
  won: boolean;
  slipAt: number;
  /** set when the roll came from MagicBlock VRF on the rollup: link to the grab transaction */
  proof?: { url: string; payoutLamports: number };
  /** a round was live onchain but the rollup did not answer, so this roll was local */
  offline?: boolean;
};

export const ROUND_SECONDS = 30;
/** Seed of the pile. The machine onchain commits to the layout this seed produces. */
export const PILE_SEED = 7;

type GameStore = {
  phase: GamePhase;
  pile: PlacedPrize[];
  taken: string[];
  /** prize the claw is going for this grab */
  aim: PlacedPrize | null;
  /** true while the aimed prize is in the fingers (it leaves the pile) */
  gripped: boolean;
  /** prize shown at the bin */
  won: PlacedPrize | null;
  /** the prize that slipped on the last grab, for the verdict */
  missed: PlacedPrize | null;
  roll: GripRoll | null;
  timeLeft: number;
  plays: number;
  wins: number;

  start: () => void;
  beginPlaying: () => void;
  beginGrab: () => void;
  setAim: (prize: PlacedPrize | null) => void;
  grip: () => void;
  setRoll: (roll: GripRoll) => void;
  /** the prize slipped out and landed back in the pile */
  dropBack: () => void;
  /** claw finished releasing over the chute */
  settle: () => void;
  showPrize: () => void;
  playAgain: () => void;
  exit: () => void;
  tick: (dt: number) => void;
};

export const useGameStore = create<GameStore>()((set, get) => ({
  phase: "attract",
  pile: generatePile(PILE_SEED),
  taken: [],
  aim: null,
  gripped: false,
  won: null,
  missed: null,
  roll: null,
  timeLeft: ROUND_SECONDS,
  plays: 0,
  wins: 0,

  start: () => set({ phase: "intro", timeLeft: ROUND_SECONDS, roll: null }),
  beginPlaying: () => {
    if (get().phase === "intro") set({ phase: "playing" });
  },
  beginGrab: () => {
    if (get().phase !== "playing") return;
    set((s) => ({ phase: "grabbing", plays: s.plays + 1, roll: null }));
  },
  setAim: (aim) => set({ aim, gripped: false }),
  grip: () => {
    if (get().aim) set({ gripped: true });
  },
  setRoll: (roll) => set({ roll }),
  dropBack: () => set({ gripped: false }),
  settle: () => {
    const { aim, roll } = get();
    if (!aim || !roll?.won) {
      set({ phase: "lost", missed: aim, aim: null, gripped: false });
      return;
    }
    set((s) => ({
      phase: "celebrate",
      won: aim,
      aim: null,
      gripped: false,
      taken: [...s.taken, aim.id],
      wins: s.wins + 1,
    }));
  },
  showPrize: () => {
    if (get().phase === "celebrate") set({ phase: "prize" });
  },
  playAgain: () =>
    set({ phase: "intro", timeLeft: ROUND_SECONDS, roll: null, won: null, missed: null }),
  exit: () =>
    set({ phase: "attract", roll: null, won: null, missed: null, aim: null, gripped: false }),
  tick: (dt) => {
    if (get().phase !== "playing") return;
    set((s) => ({ timeLeft: Math.max(0, s.timeLeft - dt) }));
  },
}));
