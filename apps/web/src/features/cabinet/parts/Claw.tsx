"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  type Group,
  type Mesh,
  Quaternion,
  Shape,
  SplineCurve,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { fingerAngle } from "@/features/round/odds";
import { DURATION } from "@/features/round/timing";
import { type ClawId, useClawStore } from "@/stores/claw.store";
import { useGameStore } from "@/stores/game.store";
import { CHUTE, CLAW_TRAVEL, PLAYFIELD } from "../config/dimensions";
import { PALETTE } from "../config/palette";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";
import { describePrize, PrizeMesh } from "../prizes/PrizeMesh";

const FINGERS = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
/** Where each finger hinges on the spider plate, relative to the cable attach point. */
const PIVOT = { r: 0.032, y: -0.125 };
const GRAVITY = 7;
/** Pendulum feel: real g over a short cable, lightly damped. */
const SWING = { g: 9.8, damping: 1.7, limit: 0.4 };
const SPIN_AXIS = new Vector3(0.7, 0.2, 0.68).normalize();
// scratch, reused every frame
const held = new Vector3();
const heldTurn = new Quaternion();
const frameTurn = new Quaternion();
const spin = new Quaternion();

/** A stamped steel finger: a curved strip that tapers to an inward talon. */
function fingerGeometry() {
  const spine = new SplineCurve(
    [
      [0, 0],
      [0.03, -0.012],
      [0.062, -0.05],
      [0.07, -0.095],
      [0.052, -0.14],
      [0.02, -0.165],
      [0.004, -0.168],
    ].map(([x, y]) => new Vector2(x, y)),
  );
  const steps = 40;
  const left: Vector2[] = [];
  const right: Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = spine.getPoint(i / steps);
    const t = spine.getTangent(i / steps);
    const half = 0.0027 * (i > 32 ? 1 - ((i - 32) / 8) * 0.5 : 1);
    left.push(new Vector2(p.x - t.y * half, p.y + t.x * half));
    right.push(new Vector2(p.x + t.y * half, p.y - t.x * half));
  }
  const g = new ExtrudeGeometry(new Shape([...left, ...right.reverse()]), {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.001,
    bevelSegments: 2,
  });
  g.translate(0, 0, -0.008);
  return g;
}

/** A helix built at its real height, so the wire stays round (never stretched). */
function coilGeometry(radius: number, turns: number, tube: number, height: number) {
  const pts: Vector3[] = [];
  const n = turns * 16;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * Math.PI * 2;
    pts.push(new Vector3(Math.cos(a) * radius, (-i / n) * height, Math.sin(a) * radius));
  }
  return new TubeGeometry(new CatmullRomCurve3(pts), n * 2, tube, 8);
}

/**
 * A three-finger crane claw: trolley on the gantry, steel cable and coiled
 * lead, solenoid housing, spider plate and three sprung fingers. The whole
 * hanging assembly swings like a pendulum when the trolley moves.
 */
export function Claw({ id }: { id: ClawId }) {
  const m = getMaterials();
  const finger = useMemo(fingerGeometry, []);
  const spring = useMemo(() => coilGeometry(0.0085, 6, 0.0011, 0.012), []);

  const bridge = useRef<Group>(null);
  const carriage = useRef<Group>(null);
  const swing = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const cord = useRef<Mesh>(null);
  const body = useRef<Group>(null);
  const fingers = useRef<(Group | null)[]>([]);
  const carried = useRef<Group>(null);

  const sway = useRef({ px: 0, pz: 0, vx: 0, vz: 0, ax: 0, az: 0, wx: 0, wz: 0, ready: false });
  const slip = useRef({ t: -1, landed: -1, done: false, from: new Vector3() });
  const drop = useRef({ t: -1, from: new Vector3(), turn: new Quaternion() });
  const root = useRef<Group>(null);
  const shown = useRef(0.6);

  const carry = useGameStore((s) => (id === "p1" && s.gripped ? s.aim : null));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const c = useClawStore.getState().claws[id];
    const len = CLAW_TRAVEL.baseCable + c.drop * CLAW_TRAVEL.maxDrop;

    bridge.current?.position.setX(c.x);
    carriage.current?.position.set(c.x, PLAYFIELD.gantryY, c.z);
    if (cable.current) {
      cable.current.scale.y = len;
      cable.current.position.y = -len / 2;
    }
    if (cord.current) {
      cord.current.scale.y = len - 0.01;
      cord.current.position.y = -(len - 0.01) / 2 - 0.004;
    }
    body.current?.position.setY(-len);

    // pendulum: trolley acceleration kicks the swing, gravity and drag settle it
    const s = sway.current;
    if (!s.ready) Object.assign(s, { px: c.x, pz: c.z, ready: true });
    const blend = Math.min(1, dt * 8);
    const vx = s.vx + ((c.x - s.px) / dt - s.vx) * blend;
    const vz = s.vz + ((c.z - s.pz) / dt - s.vz) * blend;
    const arm = len + 0.16;
    s.wx -= (vx - s.vx) / arm;
    s.wz += (vz - s.vz) / arm;
    Object.assign(s, { vx, vz, px: c.x, pz: c.z });
    const n = Math.ceil(dt * 120);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      s.wx += (-(SWING.g / arm) * s.ax - SWING.damping * s.wx) * h;
      s.wz += (-(SWING.g / arm) * s.az - SWING.damping * s.wz) * h;
      s.ax = Math.max(-SWING.limit, Math.min(SWING.limit, s.ax + s.wx * h));
      s.az = Math.max(-SWING.limit, Math.min(SWING.limit, s.az + s.wz * h));
    }
    swing.current?.rotation.set(s.az, 0, s.ax);

    // fingers: after a slip they snap shut on nothing
    if (c.phase === "idle") Object.assign(slip.current, { t: -1, landed: -1, done: false });
    const goal = slip.current.t >= 0 ? 0.04 : c.open;
    shown.current += (goal - shown.current) * Math.min(1, dt * 18);
    const angle = fingerAngle(shown.current);
    for (const f of fingers.current) if (f) f.rotation.z = angle;

    // the prize in the fingers. It lives in the cabinet's frame (not in the
    // swinging arm), so when the fingers let go it falls straight down
    // instead of being flung by the pendulum.
    const g = carried.current;
    const hang = swing.current;
    const frame = root.current;
    if (!g || !hang || !frame || !carry) return;
    const game = useGameStore.getState();
    const gripY = -len + describePrize(carry).grip.centerY;
    g.visible = true;

    // where the fingers hold it right now, swing included
    hang.updateWorldMatrix(true, false);
    held.set(0, gripY, 0).applyMatrix4(hang.matrixWorld);
    frame.worldToLocal(held);
    hang.getWorldQuaternion(heldTurn);
    frame.getWorldQuaternion(frameTurn);
    heldTurn.premultiply(frameTurn.invert());

    const [px, py, pz] = carry.position;
    const sl = slip.current;
    const slipping =
      game.roll &&
      !game.roll.won &&
      c.phase === "rising" &&
      c.t / DURATION.rising >= game.roll.slipAt;
    if (slipping && sl.t < 0) {
      sl.t = 0;
      sl.from.copy(held);
    }
    const fall = drop.current;
    if (c.phase !== "releasing") fall.t = -1;

    if (sl.t >= 0 && !sl.done) {
      // it slips out, falls back where it came from and settles
      sl.t += dt;
      const k = Math.min(1, sl.t / 0.28);
      let y = sl.from.y - 0.5 * GRAVITY * sl.t ** 2;
      if (y <= py && sl.landed < 0) sl.landed = sl.t;
      if (sl.landed >= 0) {
        const b = (sl.t - sl.landed) / 0.22;
        y = py + Math.sin(Math.min(1, b) * Math.PI) * 0.014;
        if (b >= 1) {
          sl.done = true;
          game.dropBack();
        }
      }
      g.position.set(sl.from.x + (px - sl.from.x) * k, y, sl.from.z + (pz - sl.from.z) * k);
      g.quaternion.identity();
    } else if (c.phase === "closing") {
      // the fingers close around it, lifting it off the pile into their grip
      const u = Math.min(1, c.t / DURATION.closing);
      const k = u * u * (3 - 2 * u);
      g.position.set(px + (held.x - px) * k, py + (held.y - py) * k, pz + (held.z - pz) * k);
      g.quaternion.identity().slerp(heldTurn, k);
    } else if (c.phase === "releasing") {
      // fingers spring open first, then it drops: straight down into the chute,
      // nudged to its centre by the funnel, with a little tumble
      if (fall.t < 0) {
        fall.t = 0;
        fall.from.copy(held);
        fall.turn.copy(heldTurn);
      }
      fall.t += dt;
      const t = Math.max(0, fall.t - 0.1);
      if (t === 0) {
        g.position.copy(held);
        g.quaternion.copy(heldTurn);
      } else {
        const y = fall.from.y - 0.5 * GRAVITY * t * t;
        const k = Math.min(1, t / 0.32);
        const pull = k * k * (3 - 2 * k);
        const cx = CHUTE.x;
        g.position.set(
          fall.from.x + (cx - fall.from.x) * pull,
          y,
          fall.from.z + (CHUTE.z - fall.from.z) * pull,
        );
        spin.setFromAxisAngle(SPIN_AXIS, t * 3.2);
        g.quaternion.copy(fall.turn).multiply(spin);
        // gone once it has dropped through the hole at the bottom of the chute
        g.visible = y > PLAYFIELD.floor - 0.02;
      }
    } else {
      g.position.copy(held);
      g.quaternion.copy(heldTurn);
    }
  });

  return (
    <group ref={root}>
      {/* bridge spanning front to back, slides along X */}
      <group ref={bridge} position={[0, PLAYFIELD.gantryY + 0.022, 0]}>
        {[-0.014, 0.014].map((x) => (
          <mesh key={x} material={m.chrome} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, PLAYFIELD.maxZ - PLAYFIELD.minZ + 0.08, 12]} />
          </mesh>
        ))}
      </group>

      <group ref={carriage}>
        {/* trolley: body, gear motor, cable drum */}
        <mesh material={m.brushed} position={[0, 0.018, 0]} castShadow>
          <boxGeometry args={[0.07, 0.03, 0.062]} />
        </mesh>
        <mesh material={m.blackGloss} position={[0.022, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.04, 20]} />
        </mesh>
        <mesh material={m.chrome} position={[-0.014, 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.018, 24]} />
        </mesh>

        <group ref={swing}>
          <mesh ref={cable} material={m.chrome}>
            <cylinderGeometry args={[0.0018, 0.0018, 1, 8]} />
          </mesh>
          {/* the power lead runs straight alongside the cable, like a real crane's */}
          <mesh ref={cord} material={m.rubber} position={[0.0062, 0, 0]}>
            <cylinderGeometry args={[0.0013, 0.0013, 1, 6]} />
          </mesh>

          <group ref={body}>
            <ClawBody spring={spring} />
            {FINGERS.map((ry, i) => (
              <group key={ry} rotation={[0, ry, 0]}>
                {/* hinge bracket on the spider plate */}
                <mesh material={m.brushed} position={[PIVOT.r - 0.008, PIVOT.y, 0]}>
                  <boxGeometry args={[0.018, 0.009, 0.021]} />
                </mesh>
                <group
                  position={[PIVOT.r, PIVOT.y, 0]}
                  ref={(g) => {
                    fingers.current[i] = g;
                  }}
                >
                  <mesh geometry={finger} material={m.steel} castShadow />
                  <mesh material={m.brushed} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.0032, 0.0032, 0.024, 12]} />
                  </mesh>
                  {/* rubber pad on the talon */}
                  <mesh material={m.rubber} position={[0.006, -0.167, 0]} scale={[1.5, 0.8, 1]}>
                    <sphereGeometry args={[0.0048, 12, 10]} />
                  </mesh>
                </group>
              </group>
            ))}
          </group>

        </group>
      </group>

      {carry && (
        <group ref={carried} visible={false}>
          <group rotation={carry.rotation}>
            <PrizeMesh prize={carry} />
          </group>
        </group>
      )}
    </group>
  );
}

/** Solenoid housing, plunger and spider plate. Origin is the cable attach point. */
function ClawBody({ spring }: { spring: TubeGeometry }) {
  const m = getMaterials();
  return (
    <StaticBatch>
      <mesh material={m.chrome} position={[0, -0.008, 0]}>
        <torusGeometry args={[0.007, 0.0018, 8, 20]} />
      </mesh>
      <mesh material={m.chrome} position={[0, -0.022, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.031, 0.012, 40]} />
      </mesh>
      {/* coil housing */}
      <mesh position={[0, -0.063, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.07, 48]} />
        <meshPhysicalMaterial
          color={PALETTE.hotPink}
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh material={m.blackGloss} position={[0, -0.078, 0]}>
        <cylinderGeometry args={[0.0326, 0.0326, 0.02, 48]} />
      </mesh>
      {/* status ring */}
      <mesh position={[0, -0.042, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0322, 0.0022, 10, 48]} />
        <meshBasicMaterial color={[3.2, 2.2, 2.6]} toneMapped={false} />
      </mesh>
      <mesh material={m.chrome} position={[0, -0.103, 0]} castShadow>
        <cylinderGeometry args={[0.034, 0.03, 0.01, 40]} />
      </mesh>
      {/* plunger, return spring, spider plate */}
      <mesh material={m.chrome} position={[0, -0.13, 0]}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.046, 12]} />
      </mesh>
      <mesh geometry={spring} material={m.brushed} position={[0, -0.108, 0]} />
      <mesh material={m.brushed} position={[0, PIVOT.y, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.01, 6]} />
      </mesh>
      <mesh material={m.chrome} position={[0, -0.154, 0]}>
        <cylinderGeometry args={[0.008, 0.006, 0.008, 16]} />
      </mesh>
    </StaticBatch>
  );
}

/** Fixed rails the bridges ride on. */
export function Gantry() {
  const m = getMaterials();
  const span = PLAYFIELD.maxX - PLAYFIELD.minX + 0.08;
  return (
    <group position={[0, PLAYFIELD.gantryY + 0.022, 0]}>
      {[PLAYFIELD.minZ - 0.03, PLAYFIELD.maxZ + 0.03].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh material={m.aluminum}>
            <boxGeometry args={[span, 0.026, 0.02]} />
          </mesh>
          {/* drive belt */}
          <mesh material={m.rubber} position={[0, -0.016, 0]}>
            <boxGeometry args={[span - 0.04, 0.003, 0.008]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
