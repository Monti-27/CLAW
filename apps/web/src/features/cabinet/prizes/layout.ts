import { createRng, type Rng } from "@/lib/random";
import { CHUTE, PLAYFIELD } from "../config/dimensions";
import {
  type BoxPrizeKey,
  CAPSULE_COLORS,
  COIN_LABELS,
  type CoinLabel,
  GEM_COLORS,
} from "./catalog";

type Vec3 = [number, number, number];
type Placed = { id: string; position: Vec3; rotation: Vec3 };

export type PlacedPrize =
  | (Placed & { kind: "box"; prize: BoxPrizeKey })
  | (Placed & { kind: "capsule"; color: string })
  | (Placed & { kind: "coin"; label: CoinLabel })
  | (Placed & { kind: "gem"; color: string });

export const BOX_SIZE: Vec3 = [0.13, 0.165, 0.095];
export const CAPSULE_R = 0.044;
export const COIN = { r: 0.04, h: 0.009 } as const;
export const GEM_R = 0.034;

const FLOOR = PLAYFIELD.floor;
/** Stepped shelf along the back wall so the boxes stand above the heap. */
export const RISER = { height: 0.085, depth: 0.2 } as const;
/** Each lane runs from the center divider out to the side glass. */
const LANE = { inner: 0.085, span: 0.63 } as const;
const HEAP = { u: 0.42, z: 0.07 } as const;

const laneX = (side: number, u: number) => side * (LANE.inner + u * LANE.span);

/** A prize in the settle simulation: a sphere with a position, its last position, and a radius. */
type Body = { p: Vec3; q: Vec3; r: number; prize: PlacedPrize };

/**
 * Drops a lane's loose prizes into the machine and lets them come to rest:
 * gravity, sphere contacts, friction at every contact, the glass, the divider,
 * the riser at the back and the chute. Verlet integration with position
 * constraints; a few thousand cheap steps, run once. Deterministic for a given
 * seed (no trig, only + - * / and sqrt), so every client gets the same heap and
 * the onchain Merkle root still matches.
 */
function settle(bodies: Body[], side: -1 | 1) {
  const minX = Math.min(laneX(side, 0), laneX(side, 1)) + 0.004;
  const maxX = Math.max(laneX(side, 0), laneX(side, 1)) - 0.004;
  const minZ = PLAYFIELD.minZ - 0.07 + RISER.depth + 0.002; // front face of the riser
  const maxZ = PLAYFIELD.maxZ + 0.06; // inside of the front glass
  const cx = side * Math.abs(CHUTE.x);
  const chuteR = CHUTE.radius + 0.008;
  const chuteTop = FLOOR + CHUTE.height;
  const dt = 1 / 120;
  const g = 9.8 * dt * dt;
  const STEPS = 420;

  for (let step = 0; step < STEPS; step++) {
    // integrate, with air drag
    for (const b of bodies) {
      const vx = (b.p[0] - b.q[0]) * 0.985;
      const vy = (b.p[1] - b.q[1]) * 0.985;
      const vz = (b.p[2] - b.q[2]) * 0.985;
      b.q = [b.p[0], b.p[1], b.p[2]];
      b.p = [b.p[0] + vx, b.p[1] + vy - g, b.p[2] + vz];
    }
    for (let it = 0; it < 4; it++) {
      // contacts between prizes: push apart, and rub off sideways motion (friction keeps a mound a mound)
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i] as Body;
        for (let j = i + 1; j < bodies.length; j++) {
          const c = bodies[j] as Body;
          const dx = c.p[0] - a.p[0];
          const dy = c.p[1] - a.p[1];
          const dz = c.p[2] - a.p[2];
          const min = a.r + c.r;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= min * min || d2 < 1e-12) continue;
          const d = Math.sqrt(d2);
          const pen = min - d;
          const push = (pen / d) * 0.5;
          a.p = [a.p[0] - dx * push, a.p[1] - dy * push, a.p[2] - dz * push];
          c.p = [c.p[0] + dx * push, c.p[1] + dy * push, c.p[2] + dz * push];
          // Coulomb friction (position based): the slip along the contact this step is
          // cancelled up to mu times the penetration, so capsules rest on slopes like real plastic
          const nx = dx / d;
          const ny = dy / d;
          const nz = dz / d;
          const rx = c.p[0] - c.q[0] - (a.p[0] - a.q[0]);
          const ry = c.p[1] - c.q[1] - (a.p[1] - a.q[1]);
          const rz = c.p[2] - c.q[2] - (a.p[2] - a.q[2]);
          const rn = rx * nx + ry * ny + rz * nz;
          const tx = rx - rn * nx;
          const ty = ry - rn * ny;
          const tz = rz - rn * nz;
          const tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
          if (tl > 1e-9) {
            const mu = 0.75;
            const k = tl < mu * pen ? 1 : (mu * pen) / tl;
            const fx = tx * k * 0.5;
            const fy = ty * k * 0.5;
            const fz = tz * k * 0.5;
            a.p = [a.p[0] + fx, a.p[1] + fy, a.p[2] + fz];
            c.p = [c.p[0] - fx, c.p[1] - fy, c.p[2] - fz];
          }
        }
      }
      for (const b of bodies) {
        const { r } = b;
        let [x, y, z] = b.p;
        // floor, with strong friction
        if (y < FLOOR + r) {
          // static friction on the floor: whatever lands stays where it lands
          y = FLOOR + r;
          x = b.q[0] + (x - b.q[0]) * 0.1;
          z = b.q[2] + (z - b.q[2]) * 0.1;
        }
        // the glass and the divider
        x = Math.min(maxX - r, Math.max(minX + r, x));
        z = Math.min(maxZ - r, Math.max(minZ + r, z));
        // the chute: nothing rests inside it or on its rim
        const hx = x - cx;
        const hz = z - CHUTE.z;
        const h2 = hx * hx + hz * hz;
        const need = chuteR + r;
        if (h2 < need * need && y < chuteTop + r) {
          const h = Math.sqrt(h2) || 1e-6;
          x = cx + (hx / h) * need;
          z = CHUTE.z + (hz / h) * need;
        }
        b.p = [x, y, z];
      }
    }
  }
}

/** One player's half of the machine: boxes along the back, a heap up front. */
function generateLane(side: -1 | 1, rng: Rng): PlacedPrize[] {
  const tag = side < 0 ? "L" : "R";
  const out: PlacedPrize[] = [];

  // back row on the riser: collector boxes standing up, the legend in the middle
  const boxes: BoxPrizeKey[] = ["sol", "legend", "sol"];
  boxes.forEach((prize, i) => {
    out.push({
      id: `${tag}-box-${i}`,
      kind: "box",
      prize,
      position: [
        laneX(side, 0.2 + i * 0.3),
        FLOOR + RISER.height + BOX_SIZE[1] / 2,
        -0.24 + rng.range(-0.008, 0.008),
      ],
      rotation: [0, rng.range(-0.22, 0.22), 0],
    });
  });

  // everything loose is dropped in a column over the heap and allowed to settle
  const bodies: Body[] = [];
  const heapX = laneX(side, HEAP.u);
  const drop = (prize: PlacedPrize, r: number, i: number) => {
    // a loose cluster above the heap, each prize a little higher than the last, so they pour in
    const sx = (rng.next() + rng.next() + rng.next() - 1.5) * 0.15;
    const sz = (rng.next() + rng.next() + rng.next() - 1.5) * 0.1;
    const y = FLOOR + 0.06 + i * 0.018;
    const p: Vec3 = [heapX + sx, y, HEAP.z + sz];
    bodies.push({ p, q: [p[0], p[1], p[2]], r, prize });
  };

  const items: { make: (i: number) => PlacedPrize; r: number }[] = [];
  for (let i = 0; i < 40; i++) {
    items.push({
      r: CAPSULE_R,
      make: (n) => ({
        id: `${tag}-cap-${n}`,
        kind: "capsule",
        color: rng.pick(CAPSULE_COLORS),
        position: [0, 0, 0],
        // tumbled any which way, as capsules land
        rotation: [rng.range(-Math.PI, Math.PI), rng.range(0, Math.PI * 2), rng.range(-Math.PI, Math.PI)],
      }),
    });
  }
  for (let i = 0; i < 6; i++) {
    items.push({
      // a coin rides in the gaps between capsules; its contact sphere is small so it nestles in
      r: 0.016,
      make: (n) => ({
        id: `${tag}-coin-${n}`,
        kind: "coin",
        label: rng.pick(COIN_LABELS),
        position: [0, 0, 0],
        rotation: [rng.range(-0.55, 0.55), rng.range(0, Math.PI * 2), rng.range(-0.55, 0.55)],
      }),
    });
  }
  for (let i = 0; i < 4; i++) {
    items.push({
      r: GEM_R * 0.92,
      make: (n) => ({
        id: `${tag}-gem-${n}`,
        kind: "gem",
        color: rng.pick(GEM_COLORS),
        position: [0, 0, 0],
        rotation: [rng.range(-0.6, 0.6), rng.range(0, Math.PI * 2), rng.range(-0.6, 0.6)],
      }),
    });
  }
  // shuffle so coins and gems end up through the heap, not all on top
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [items[i], items[j]] = [items[j] as (typeof items)[number], items[i] as (typeof items)[number]];
  }
  items.forEach((it, i) => drop(it.make(i), it.r, i));

  settle(bodies, side);

  for (const b of bodies) {
    // millimetre grid: what the program sees, and what everyone renders
    const at = b.p.map((v) => Math.round(v * 10000) / 10000) as Vec3;
    // coins sit low in their contact sphere: drop them onto what's under them
    if (b.prize.kind === "coin") at[1] -= 0.016 - COIN.h;
    out.push({ ...b.prize, position: at } as PlacedPrize);
  }
  return out;
}

/**
 * Builds the pile from a seed. Today the seed is a constant; once the program
 * is live it is the VRF output stored on the round account, so every client
 * (player and spectators) renders an identical machine.
 */
const built = new Map<number, PlacedPrize[]>();
export function generatePile(seed: number): PlacedPrize[] {
  const hit = built.get(seed);
  if (hit) return hit;
  const rng = createRng(seed);
  const pile = [...generateLane(-1, rng), ...generateLane(1, rng)];
  built.set(seed, pile);
  return pile;
}
