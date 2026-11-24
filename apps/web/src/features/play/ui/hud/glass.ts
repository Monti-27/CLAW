/**
 * The HUD's one surface, shared with the sound button: dark smoked glass,
 * a hairline rim and a lit top edge. Everything on screen during a round sits
 * on this, so the readouts feel like one instrument cluster.
 */
export const GLASS =
  "bg-[rgb(16_9_14/0.46)] backdrop-blur-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.1),0_14px_40px_-14px_rgba(0,0,0,0.7)] [[data-tier=low]_&]:bg-[rgb(22_12_20/0.92)] [[data-tier=low]_&]:backdrop-blur-none";

/** Readout label: tiny caps, wide tracking, quiet. */
export const LABEL = "text-[9.5px] leading-none font-semibold tracking-[0.18em] uppercase text-paper/42";

/** Readout figures: the UI face with tabular digits, never a fallback monospace. */
export const FIGURE = "font-sans font-semibold tabular-nums tracking-[-0.03em]";
