/**
 * Every measurement of the cabinet, in meters.
 * Parts read from here so the whole machine can be re-proportioned in one place.
 */

export const CABINET = {
  width: 1.6,
  depth: 0.86,
} as const;

export const PLINTH = {
  height: 0.07,
  inset: 0.05,
} as const;

export const TOWER = {
  width: 0.28,
  height: 1.12,
  /** how far a tower stands proud of the lower body's front face */
  protrude: 0.035,
} as const;

/** Lower body sits between the two towers. */
export const BODY = {
  width: CABINET.width - TOWER.width * 2,
  top: 1.02,
  depth: CABINET.depth - 0.08,
} as const;

export const DECK = {
  bottom: BODY.top,
  height: 0.12,
  /** tilt of the button panel, radians */
  tilt: 0.42,
} as const;

export const LEDGE = {
  bottom: DECK.bottom + DECK.height,
  height: 0.05,
} as const;

export const CASE = {
  bottom: LEDGE.bottom + LEDGE.height,
  height: 0.74,
  frame: 0.026,
} as const;

export const CASE_TOP = CASE.bottom + CASE.height;

export const MARQUEE = {
  bottom: CASE_TOP + 0.025,
  height: 0.26,
  overhang: 0.025,
} as const;

/** Lacquer band above and below the marquee's lit face, where the chaser bulbs sit. */
export const MARQUEE_BAND = 0.036;

/** Inside of the glass, where prizes live and claws travel. */
export const PLAYFIELD = {
  floor: CASE.bottom + 0.012,
  minX: -CABINET.width / 2 + 0.07,
  maxX: CABINET.width / 2 - 0.07,
  minZ: -CABINET.depth / 2 + 0.08,
  maxZ: CABINET.depth / 2 - 0.08,
  gantryY: CASE_TOP - 0.05,
} as const;

export const CHUTE = {
  x: PLAYFIELD.minX + 0.11,
  z: PLAYFIELD.maxZ - 0.1,
  radius: 0.095,
  height: 0.17,
} as const;

/**
 * Claw travel. The claw body hangs from the cable; its fingertips sit
 * `reach` below the attach point.
 */
const BASE_CABLE = 0.07;
const REACH = 0.3;
export const CLAW_TRAVEL = {
  baseCable: BASE_CABLE,
  reach: REACH,
  restY: PLAYFIELD.gantryY - BASE_CABLE,
  maxDrop: PLAYFIELD.gantryY - BASE_CABLE - (PLAYFIELD.floor + REACH),
} as const;

/** Prize bin cut into the lower body, where a win is revealed. */
export const PRIZE_DOOR = {
  x: 0,
  y: 0.37,
  z: CABINET.depth / 2 - 0.04,
  width: 0.44,
  height: 0.27,
  depth: 0.2,
} as const;
