/** Cabinet colors. Two-tone lacquer pink, chrome, orange claw plastic. */
export const PALETTE = {
  hotPink: "#e8478f",
  hotPinkDeep: "#c92f74",
  blush: "#f7bfd3",
  blushLight: "#fbd9e5",
  marqueeGlow: "#ffe6f0",
  chrome: "#e9e9ef",
  plinth: "#18161c",
  interior: "#f4f2f6",
  clawOrange: "#ffa51f",
  clawHead: "#f4f4f6",
  buttonGreen: "#2fc48d",
  buttonOrange: "#ff8a1f",
  buttonRed: "#ff4d5e",
  buttonBlue: "#3b82f6",
  void: "#0c070f",
  plum: "#1b0f1e",
  brass: "#e2b36a",
  paper: "#fff5ee",
} as const;

export type PaletteKey = keyof typeof PALETTE;
