"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  ExtrudeGeometry,
  type Group,
  type MeshBasicMaterial,
  MeshPhysicalMaterial,
  Shape,
} from "three";
import { type GamePhase, useGameStore } from "@/stores/game.store";
import { getMaterials } from "../materials";
import { type Draw, paintTexture } from "../textures/canvas";

const BLADES = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2);
const GUARD_RINGS = [0.3, 0.5, 0.7, 0.9];
const SPOKES = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4);

/** How hard the cabinet is working, in rad/s. The fan follows with inertia. */
const TARGET: Record<GamePhase, number> = {
  attract: 9,
  intro: 30,
  playing: 34,
  grabbing: 40,
  lost: 30,
  celebrate: 46,
  prize: 38,
};
/** Fastest the blades are drawn turning; past this the blur disc carries the speed. */
const DRAWN_MAX = 13;

/** One swept, cambered blade lying along +Y from the hub out to the tip. */
function bladeGeometry(r0: number, r1: number) {
  const steps = 14;
  const lead: [number, number][] = [];
  const trail: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = r0 + (r1 - r0) * t;
    const chord = (0.3 + 0.42 * Math.sin(t * Math.PI * 0.6)) * r1;
    const sweep = 0.34 * r1 * t * t;
    lead.push([sweep - chord * 0.5, r]);
    trail.push([sweep + chord * 0.5, r]);
  }
  const s = new Shape();
  const first = trail[0] as [number, number];
  s.moveTo(first[0], first[1]);
  for (const [x, y] of trail) s.lineTo(x, y);
  const tip = trail[steps] as [number, number];
  const tipLead = lead[steps] as [number, number];
  s.quadraticCurveTo((tip[0] + tipLead[0]) / 2, r1 * 1.07, tipLead[0], tipLead[1]);
  for (const [x, y] of lead.reverse()) s.lineTo(x, y);
  s.closePath();

  const g = new ExtrudeGeometry(s, { depth: r1 * 0.02, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -r1 * 0.01);
  // pitch the blade about its own length so it actually bites air
  g.rotateY(0.52);
  return g;
}

/** Streaked ring: what spinning blades smear into. */
const drawBlur: Draw = (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  for (let i = 0; i < 260; i++) {
    const r = (0.3 + Math.random() * 0.66) * (w / 2);
    const a = Math.random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(28,22,32,${0.05 + Math.random() * 0.16})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, a, a + 0.5 + Math.random() * 1.4);
    ctx.stroke();
  }
};

/**
 * Exhaust fan behind a wire guard. It idles when nobody is playing, spins up
 * as the machine works and coasts back down. At speed the blades give way to
 * a motion-blur disc, the way a real fan looks to the eye.
 */
export function Fan({ radius = 0.086 }: { radius?: number }) {
  const m = getMaterials();
  const blade = useMemo(() => bladeGeometry(radius * 0.26, radius * 0.93), [radius]);
  const bladeMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: "#221b27",
        roughness: 0.38,
        clearcoat: 0.7,
        transparent: true,
      }),
    [],
  );
  const blurTex = useMemo(() => paintTexture(256, 256, drawBlur), []);
  const rotor = useRef<Group>(null);
  const smear = useRef<Group>(null);
  const smearMat = useRef<MeshBasicMaterial>(null);
  const omega = useRef(TARGET.attract);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const target = TARGET[useGameStore.getState().phase];
    // a rotor with inertia: quick to spin up under power, slow to coast down
    const rate = target > omega.current ? 1.1 : 0.45;
    omega.current += (target - omega.current) * (1 - Math.exp(-dt * rate));

    const drawn = DRAWN_MAX * Math.tanh(omega.current / DRAWN_MAX);
    if (rotor.current) rotor.current.rotation.z -= drawn * dt;
    if (smear.current) smear.current.rotation.z -= omega.current * 0.37 * dt;

    const fast = Math.min(1, Math.max(0, (omega.current - 12) / 26));
    bladeMat.opacity = 1 - fast * 0.55;
    if (smearMat.current) smearMat.current.opacity = fast * 0.85;
  });

  return (
    <group userData={{ noMerge: true }}>
      {/* shroud and the dark well behind the rotor */}
      <mesh material={m.plinth}>
        <circleGeometry args={[radius * 1.06, 48]} />
      </mesh>
      <mesh material={m.blackGloss} position={[0, 0, 0.006]}>
        <torusGeometry args={[radius * 1.08, 0.006, 10, 56]} />
      </mesh>

      <group ref={rotor} position={[0, 0, 0.006]}>
        {BLADES.map((a) => (
          <mesh key={a} geometry={blade} material={bladeMat} rotation={[0, 0, a]} />
        ))}
        <mesh material={m.blackGloss} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.27, radius * 0.3, 0.014, 32]} />
        </mesh>
        {/* off-center mark on the hub, so you can read the rotation */}
        <mesh material={m.brushed} position={[radius * 0.13, 0, 0.0075]}>
          <circleGeometry args={[radius * 0.06, 16]} />
        </mesh>
      </group>

      <group ref={smear} position={[0, 0, 0.011]}>
        <mesh>
          <circleGeometry args={[radius * 0.96, 48]} />
          <meshBasicMaterial
            ref={smearMat}
            map={blurTex}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* wire guard */}
      <group position={[0, 0, 0.018]}>
        {GUARD_RINGS.map((k) => (
          <mesh key={k} material={m.chrome}>
            <torusGeometry args={[radius * 1.02 * k, 0.0014, 6, 48]} />
          </mesh>
        ))}
        {SPOKES.map((a) => (
          <mesh key={a} material={m.chrome} rotation={[0, 0, a]} position={[0, 0, 0.001]}>
            <boxGeometry args={[radius * 2.1, 0.0026, 0.0026]} />
          </mesh>
        ))}
        <mesh material={m.brushed} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.2, radius * 0.2, 0.004, 24]} />
        </mesh>
      </group>
      {[45, 135, 225, 315].map((d) => (
        <mesh
          key={d}
          material={m.chrome}
          position={[
            Math.cos((d * Math.PI) / 180) * radius * 1.32,
            Math.sin((d * Math.PI) / 180) * radius * 1.32,
            0.002,
          ]}
        >
          <sphereGeometry args={[0.0045, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}
