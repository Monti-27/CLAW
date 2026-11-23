import type { ClawPhase } from "@/stores/claw.store";

/** Seconds each phase of a grab takes. */
export const DURATION: Record<Exclude<ClawPhase, "idle">, number> = {
  dropping: 1.35,
  closing: 0.6,
  rising: 1.5,
  returning: 1.5,
  releasing: 0.8,
};

export const NEXT: Record<Exclude<ClawPhase, "idle">, ClawPhase> = {
  dropping: "closing",
  closing: "rising",
  rising: "returning",
  returning: "releasing",
  releasing: "idle",
};

/** long enough to read the verdict and watch the roll land on its scale */
export const LOST_HOLD = 3.4;
export const CELEBRATE_HOLD = 4.2;
