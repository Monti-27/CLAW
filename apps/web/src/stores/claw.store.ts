import { create } from "zustand";
import { CHUTE, PLAYFIELD } from "@/features/cabinet/config/dimensions";

export type ClawId = "p1" | "p2";

export type ClawPhase = "idle" | "dropping" | "closing" | "rising" | "returning" | "releasing";

export type ClawState = {
  x: number;
  z: number;
  /** 0 = parked at the gantry, 1 = fully lowered */
  drop: number;
  /** 0 = closed, 1 = fully open */
  open: number;
  /** how far this grab lowers (0..1), set from the target's height */
  depth: number;
  /** how open the fingers stay once closed around the target */
  grip: number;
  phase: ClawPhase;
  /** seconds spent in the current phase */
  t: number;
};

export type Lane = { minX: number; maxX: number; homeX: number; homeZ: number };

/** Each player owns one half of the playfield; home is above their chute. */
export const LANES: Record<ClawId, Lane> = {
  p1: { minX: PLAYFIELD.minX + 0.05, maxX: -0.06, homeX: CHUTE.x, homeZ: CHUTE.z },
  p2: { minX: 0.06, maxX: PLAYFIELD.maxX - 0.05, homeX: -CHUTE.x, homeZ: CHUTE.z },
};

/** Finger opening while the claw waits at the gantry. */
export const IDLE_OPEN = 0.62;

const parked = (id: ClawId): ClawState => ({
  x: LANES[id].homeX,
  z: LANES[id].homeZ,
  drop: 0,
  open: IDLE_OPEN,
  depth: 1,
  grip: 0,
  phase: "idle",
  t: 0,
});

type Input = { dx: number; dz: number };

type ClawStore = {
  claws: Record<ClawId, ClawState>;
  input: Input;
  setInput: (input: Partial<Input>) => void;
  grab: (id: ClawId, depth?: number, grip?: number) => void;
  patch: (id: ClawId, next: Partial<ClawState>) => void;
};

/**
 * Claw state lives outside React renders: scene parts read it with getState()
 * inside useFrame, so 60fps updates never re-render the tree.
 */
export const useClawStore = create<ClawStore>()((set, get) => ({
  claws: { p1: parked("p1"), p2: parked("p2") },
  input: { dx: 0, dz: 0 },
  setInput: (input) => set({ input: { ...get().input, ...input } }),
  grab: (id, depth = 1, grip = 0) => {
    if (get().claws[id].phase !== "idle") return;
    get().patch(id, { phase: "dropping", t: 0, depth, grip });
  },
  patch: (id, next) => set((s) => ({ claws: { ...s.claws, [id]: { ...s.claws[id], ...next } } })),
}));
