import { CLAW_TRAVEL, PLAYFIELD, PRIZE_DOOR } from "@/features/cabinet/config/dimensions";
import type { GamePhase } from "@/stores/game.store";

type Vec3 = [number, number, number];
export type Shot = { position: Vec3; target: Vec3 };
export type Framing = "wide" | "portrait";

/** Vertical field of view per framing. Portrait phones need it wider. */
export const FOV: Record<Framing, number> = { wide: 36, portrait: 52 };

/** Player 1 stands at the left station; its lane is the left half of the glass. */
const LANE_X = -0.36;
const DOOR: Vec3 = [PRIZE_DOOR.x, PRIZE_DOOR.y + 0.01, PRIZE_DOOR.z + 0.06];

type StaticPhase = Exclude<GamePhase, "grabbing" | "lost">;

/** Middle of the machine, plinth to marquee (it is 2.2m tall). */
const MACHINE: Vec3 = [0, 1.1, 0];

/**
 * Title shot: the machine dead centre, seen three-quarters from the front
 * right and a touch from above, filling about half the frame's height.
 * (azimuth 25 deg, elevation 12 deg, 6.8m out)
 */
const TITLE_WIDE: Shot = { position: [2.81, 2.51, 6.03], target: MACHINE };
const TITLE_TALL: Shot = { position: [1.6, 2.6, 8.6], target: [0, 1.25, 0] };

/**
 * The player's station. Framed from the real heights: deck 1.02 to 1.14m,
 * glass 1.19 to 1.93m. The deck sits in the bottom third with room for the
 * hint below it, the claw and gantry near the top with room for the timer.
 */
const STATION_WIDE: Shot = { position: [LANE_X + 0.1, 2.0, 2.2], target: [LANE_X + 0.04, 1.4, 0.08] };
const STATION_TALL: Shot = { position: [LANE_X + 0.04, 2.15, 2.75], target: [LANE_X, 1.38, 0.08] };

const SHOTS: Record<Framing, Record<StaticPhase, Shot>> = {
  wide: {
    attract: TITLE_WIDE,
    intro: STATION_WIDE,
    playing: STATION_WIDE,
    // the whole machine, a little closer than the title, while it lights up
    celebrate: { position: [2.2, 2.25, 4.5], target: [0, 1.35, 0] },
    // the bin sits left of center so the prize card has the right side to itself
    prize: { position: [0.62, 0.56, 1.3], target: [DOOR[0] + 0.24, DOOR[1], DOOR[2]] },
  },
  portrait: {
    attract: TITLE_TALL,
    intro: STATION_TALL,
    playing: STATION_TALL,
    celebrate: { position: [1.2, 2.3, 5.6], target: [0, 1.3, 0] },
    prize: { position: [0.12, 0.52, 1.45], target: [DOOR[0], DOOR[1] - 0.08, DOOR[2]] },
  },
};

/**
 * Where the camera waits behind the boot screen: further out along the same
 * line as the title shot (and still inside the hall), so walking in is one
 * straight push toward a machine that stays centred the whole way.
 */
export function establishShot(framing: Framing): Shot {
  const t = SHOTS[framing].attract;
  const dir = t.position.map((v, i) => v - (t.target[i] ?? 0)) as Vec3;
  const len = Math.hypot(...dir);
  const out = framing === "wide" ? 9.8 : 10.4;
  return {
    position: [
      t.target[0] + (dir[0] / len) * out,
      t.target[1] + (dir[1] / len) * out + 0.9,
      t.target[2] + (dir[2] / len) * out,
    ],
    target: t.target,
  };
}

export function staticShot(phase: StaticPhase, framing: Framing): Shot {
  return SHOTS[framing][phase];
}

/** Height of the claw's attach point for a given drop (0..1). */
export const clawBodyY = (drop: number) =>
  PLAYFIELD.gantryY - (CLAW_TRAVEL.baseCable + drop * CLAW_TRAVEL.maxDrop);

/** Grab cam: steps back a little and keeps its eyes on the fingers. */
export function followShot(claw: { x: number; z: number; drop: number }, framing: Framing): Shot {
  const portrait = framing === "portrait";
  // steps back a little from the station and leans after the claw, never so close the glass fills the frame
  return {
    position: [claw.x * 0.45 + LANE_X * 0.55 + 0.1, portrait ? 2.0 : 1.86, portrait ? 2.5 : 1.95],
    target: [claw.x * 0.85 + LANE_X * 0.15, clawBodyY(claw.drop) - 0.18, claw.z * 0.4],
  };
}

/** Fixed views for looking the model over: add ?shot=back (or claw, pile, deck) to the URL. */
export const INSPECT: Record<string, Shot> = {
  back: { position: [-1.9, 1.5, -3.6], target: [0, 1.12, 0] },
  backplate: { position: [-0.7, 1.75, -2.4], target: [0.06, 1.6, -0.43] },
  service: { position: [0.75, 0.75, -1.5], target: [0.3, 0.56, -0.43] },
  claw: { position: [-0.3, 1.78, 0.75], target: [-0.62, 1.68, 0.25] },
  pile: { position: [-0.1, 1.62, 1.0], target: [-0.36, 1.3, 0] },
  deck: { position: [-0.36, 1.42, 0.9], target: [-0.3, 1.08, 0.42] },
  bin: { position: [0.62, 0.56, 1.3], target: [0.24, 0.38, 0.45] },
  party: { position: [2.3, 2.0, 4.6], target: [0, 2.15, 0] },
};

/** True when the URL asks for one of the fixed inspect views. */
export const isInspecting = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("shot");
