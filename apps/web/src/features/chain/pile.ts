import { BN } from "@anchor-lang/core";
import { PLAYFIELD } from "@/features/cabinet/config/dimensions";
import type { BoxPrizeKey } from "@/features/cabinet/prizes/catalog";
import { generatePile, type PlacedPrize } from "@/features/cabinet/prizes/layout";
import { describePrize } from "@/features/cabinet/prizes/PrizeMesh";
import { ODDS } from "@/features/round/odds";
import { LANES } from "@/stores/claw.store";
import { PILE_SEED } from "@/stores/game.store";
import { CHAIN } from "./config";
import { buildTree, type PileLeaf, type PileTree } from "./merkle";
import type { MachineConfig } from "./program";

/**
 * The pile as the program sees it: every prize is (index, kind, x, z) in
 * millimetres, and the machine stores the Merkle root over all of them.
 * A grab sends one prize with its proof, so the program can check the prize
 * is real and measure how far the claw is from it.
 */

/** Order of `prize_values_x100` in the program. */
const BOX_KIND: Record<BoxPrizeKey, number> = { legend: 0, sol: 1, jup: 2, bonk: 3 };
const KIND = { capsule: 4, coin: 5, gem: 6 } as const;

export const toMm = (metres: number) => Math.round(metres * 1000);

export const prizeKind = (p: PlacedPrize) => (p.kind === "box" ? BOX_KIND[p.prize] : KIND[p.kind]);

export const pileLeaves = (pile: PlacedPrize[]): PileLeaf[] =>
  pile.map((p, index) => ({
    index,
    kind: prizeKind(p),
    xMm: toMm(p.position[0]),
    zMm: toMm(p.position[2]),
  }));

let tree: Promise<PileTree> | null = null;

/** Tree for the pile every client renders (same seed, same layout, same root). */
export function pileTree() {
  tree ??= buildTree(pileLeaves(generatePile(PILE_SEED)));
  return tree;
}

const sample = { id: "", position: [0, 0, 0], rotation: [0, 0, 0] } as const;
const SAMPLES: PlacedPrize[] = [
  { ...sample, kind: "box", prize: "legend" },
  { ...sample, kind: "box", prize: "sol" },
  { ...sample, kind: "box", prize: "jup" },
  { ...sample, kind: "box", prize: "bonk" },
  { ...sample, kind: "capsule", color: "" },
  { ...sample, kind: "coin", label: "SOL" },
  { ...sample, kind: "gem", color: "" },
] as unknown as PlacedPrize[];

/** Player lane in millimetres. Matches the clamp in ClawDirector. */
export const LANE_MM = {
  minX: toMm(LANES.p1.minX),
  maxX: toMm(LANES.p1.maxX),
  minZ: toMm(PLAYFIELD.minZ + 0.06),
  maxZ: toMm(PLAYFIELD.maxZ - 0.05),
  homeX: toMm(LANES.p1.homeX),
  homeZ: toMm(LANES.p1.homeZ),
} as const;

/**
 * The machine config the program should hold, derived from the same constants
 * the game renders and plays with. Used once, by the admin page.
 */
export async function machineConfigFromGame(playPriceLamports: number): Promise<MachineConfig> {
  const { root, leaves } = await pileTree();
  return {
    playPrice: new BN(playPriceLamports),
    payoutRatioBps: Math.round(ODDS.payoutRatio * 10_000),
    boostBps: Math.round(ODDS.boost * 10_000),
    capPpm: Math.round(ODDS.cap * 1_000_000),
    floorPpm: Math.round(ODDS.floor * 1_000_000),
    reachMm: toMm(ODDS.reach),
    ...LANE_MM,
    prizeValuesX100: SAMPLES.map((p) => Math.round(describePrize(p).value * 100)),
    pileRoot: Array.from(root),
    pileSeed: PILE_SEED,
    pileSize: leaves.length,
    maxCredits: 10,
    validator: CHAIN.erValidator,
  };
}
