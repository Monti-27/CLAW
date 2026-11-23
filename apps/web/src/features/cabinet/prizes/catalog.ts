import type { BoxArt } from "../textures/art";

/**
 * Prize catalog. Values feed the odds formula
 * (hold = playPrice * payoutRatio / value), so rarer means a weaker grip.
 */
export const BOX_PRIZES = {
  legend: {
    label: "LEGEND",
    ink: "#14101a",
    foilA: "#fff3d2",
    foilB: "#e0a84a",
    body: "#17121d",
    tier: "Legendary",
    value: 50,
  },
  sol: {
    label: "SOL",
    ink: "#2c1b5e",
    foilA: "#cdb0ff",
    foilB: "#69f0c4",
    body: "#2c1b5e",
    tier: "Rare",
    value: 10,
  },
  jup: {
    label: "JUP",
    ink: "#0f4a41",
    foilA: "#bfffe0",
    foilB: "#58c8ff",
    body: "#0f4a41",
    tier: "Rare",
    value: 5,
  },
  bonk: {
    label: "BONK",
    ink: "#8a3a12",
    foilA: "#ffe0b0",
    foilB: "#ff8f52",
    body: "#8a3a12",
    tier: "Rare",
    value: 5,
  },
} satisfies Record<string, BoxArt & { body: string; value: number }>;

export type BoxPrizeKey = keyof typeof BOX_PRIZES;

/** Gachapon base colours: glossy candy plastic, picked to read apart from each other in a heap. */
export const CAPSULE_COLORS = [
  "#ec3f8c",
  "#ffb12e",
  "#7a5cff",
  "#18c49a",
  "#ff6a3d",
  "#2fa8ff",
  "#f7f1ea",
] as const;
export const GEM_COLORS = ["#ff6fb0", "#8ff0ff", "#b9a2ff", "#ffe08a"] as const;

/** Faces struck on the prize tokens: the chain, and the game. */
export const COIN_LABELS = ["SOL", "CLAW"] as const;
export type CoinLabel = (typeof COIN_LABELS)[number];
