import { CHUTE, CLAW_TRAVEL, PLAYFIELD } from "@/features/cabinet/config/dimensions";
import type { PlacedPrize } from "@/features/cabinet/prizes/layout";
import { describePrize } from "@/features/cabinet/prizes/PrizeMesh";

/**
 * Pure odds math, mirrored by the onchain program.
 * hold = min(cap, playPrice * payoutRatio * boost / value) * alignment
 * Every prize has the same expected value per play; aim scales the chance.
 */
export const ODDS = {
  playPrice: 1,
  payoutRatio: 0.8,
  /** devnet demo boost so judges see wins; set to 1 for real economics */
  boost: 2.5,
  cap: 0.85,
  floor: 0.03,
  /** horizontal distance (m) within which the claw can grab a prize */
  reach: 0.08,
} as const;

/** Finger geometry: tip radius at rotation 0, lever length, and the open-to-angle map. */
const FINGER = { tipRadius: 0.042, lever: 0.17, closed: -0.2, sweep: 0.6 } as const;

export type Target = { prize: PlacedPrize; distance: number };

/** The prize the claw would land on: the highest one within reach. */
export function pickTarget(x: number, z: number, pile: PlacedPrize[]): Target | null {
  let best: Target | null = null;
  let bestTop = Number.NEGATIVE_INFINITY;
  for (const p of pile) {
    const d = Math.hypot(p.position[0] - x, p.position[2] - z);
    if (d > ODDS.reach) continue;
    const top = p.position[1] + describePrize(p).height / 2;
    if (top > bestTop) {
      bestTop = top;
      best = { prize: p, distance: d };
    }
  }
  return best;
}

/** Fingertips sit this far below the cable attach point. */
const TIP_DEPTH = 0.3;

/**
 * How far to lower (0..1) so the fingers close around the target, not through it.
 * Over the chute with nothing to grab, the claw stops just above its rim
 * instead of plunging into the tube.
 */
export function dropDepth(target: Target | null, x = 0, z = 0): number {
  if (!target) {
    const overChute = Math.hypot(Math.abs(x) - Math.abs(CHUTE.x), z - CHUTE.z) < CHUTE.radius + 0.05;
    if (!overChute) return 1;
    const bodyY = PLAYFIELD.floor + CHUTE.height + 0.02 + TIP_DEPTH;
    return Math.min(1, Math.max(0.1, (CLAW_TRAVEL.restY - bodyY) / CLAW_TRAVEL.maxDrop));
  }
  const bodyY = target.prize.position[1] - describePrize(target.prize).grip.centerY;
  return Math.min(1, Math.max(0.15, (CLAW_TRAVEL.restY - bodyY) / CLAW_TRAVEL.maxDrop));
}

/** How far the fingers stay open (0..1) once they are wrapped around the target. */
export function gripOpen(target: Target | null): number {
  if (!target) return 0;
  const { radius } = describePrize(target.prize).grip;
  const angle = (radius - FINGER.tipRadius) / FINGER.lever;
  return Math.min(1, Math.max(0, (angle - FINGER.closed) / FINGER.sweep));
}

export const fingerAngle = (open: number) => FINGER.closed + open * FINGER.sweep;

export function holdChance(target: Target | null): number {
  if (!target) return 0;
  const { value } = describePrize(target.prize);
  const base = Math.min(ODDS.cap, (ODDS.playPrice * ODDS.payoutRatio * ODDS.boost) / value);
  const alignment = 1 - (target.distance / ODDS.reach) ** 2 * 0.6;
  return Math.max(ODDS.floor, base * alignment);
}

/**
 * Local stand-in for the VRF callback. The program will run the same compare
 * against MagicBlock VRF randomness on the Ephemeral Rollup. On a miss the
 * same randomness also decides how high the prize gets before it slips.
 */
export function rollGrip(target: Target | null) {
  const need = holdChance(target);
  // dev only: `__clawForceWin = true` in the console makes every aimed grab hold
  const force =
    process.env.NODE_ENV !== "production" &&
    (globalThis as { __clawForceWin?: boolean }).__clawForceWin === true;
  const value = force ? 0 : Math.random();
  return {
    value,
    need,
    won: target !== null && value < need,
    slipAt: 0.25 + ((value * 7.3) % 1) * 0.4,
  };
}
