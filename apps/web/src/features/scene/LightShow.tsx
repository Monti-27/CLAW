"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type InstancedMesh,
  type Mesh,
  Object3D,
  type ShaderMaterial,
  Vector3,
} from "three";
import { useGameStore } from "@/stores/game.store";
import { useQualityStore } from "@/stores/quality.store";

/** Two colors only: lamp-warm and the cabinet's own pink. */
const BEAMS = [
  { color: "#ffd9b0", x: -2.1 },
  { color: "#ff5a9c", x: -0.7 },
  { color: "#ffd9b0", x: 0.7 },
  { color: "#ff5a9c", x: 2.1 },
].map((b) => ({ ...b, from: new Vector3(b.x, 4.4, 2.6) }));
const BEAM_LEN = 4.6;
const BEAM_ANGLE = 0.11;
const FOIL = ["#f6cf7a", "#ff6aa8", "#fff6ea", "#e8b04a"];
const UP = new Vector3(0, 1, 0);

const partyLevel = () => {
  const p = useGameStore.getState().phase;
  return p === "celebrate" ? 1 : p === "prize" ? 0.18 : 0;
};

/** Win celebration: searchlight beams and foil confetti (the case lamps pulse in GlassCase). */
export function LightShow() {
  return (
    <>
      <Searchlights />
      <Confetti />
    </>
  );
}

function Searchlights() {
  const cones = useRef<(Mesh | null)[]>([]);
  const level = useRef(0);
  const dir = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    level.current += (partyLevel() - level.current) * Math.min(1, delta * 2.6);
    cones.current.forEach((cone, i) => {
      if (!cone) return;
      cone.visible = level.current > 0.02;
      if (!cone.visible) return;
      // slow crossing sweeps, each beam on its own period
      const a = t * (0.55 + i * 0.13) + i * 1.7;
      target.set(Math.sin(a) * 0.9, 1.0 + Math.sin(a * 0.7) * 0.55, Math.cos(a * 0.8) * 0.35);
      const from = BEAMS[i]?.from;
      if (!from) return;
      dir.subVectors(target, from).normalize();
      cone.position.copy(from).addScaledVector(dir, BEAM_LEN / 2);
      cone.quaternion.setFromUnitVectors(UP, dir.negate());
      const u = (cone.material as ShaderMaterial).uniforms.strength;
      if (u) u.value = level.current;
    });
  });

  return (
    <>
      {BEAMS.map((b, i) => (
        <mesh
          key={b.x}
          ref={(m) => {
            cones.current[i] = m;
          }}
          visible={false}
        >
          <coneGeometry args={[BEAM_LEN * Math.tan(BEAM_ANGLE), BEAM_LEN, 20, 1, true]} />
          <BeamMaterial color={b.color} />
        </mesh>
      ))}
    </>
  );
}

/** A beam in haze: bright core, soft edges, fading with distance from the lamp. */
function BeamMaterial({ color }: { color: string }) {
  const uniforms = useMemo(
    () => ({ tint: { value: new Color(color) }, strength: { value: 0 } }),
    [color],
  );
  return (
    <shaderMaterial
      uniforms={uniforms}
      transparent
      depthWrite={false}
      blending={AdditiveBlending}
      side={DoubleSide}
      fog={false}
      vertexShader={
        /* glsl */ `
        varying vec3 vNormal; varying vec3 vView; varying float vAlong;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          vAlong = uv.y;
          gl_Position = projectionMatrix * mv;
        }`
      }
      fragmentShader={
        /* glsl */ `
        uniform vec3 tint; uniform float strength;
        varying vec3 vNormal; varying vec3 vView; varying float vAlong;
        void main() {
          float facing = clamp(abs(dot(normalize(vNormal + 1e-5), normalize(vView))), 0.0, 1.0);
          float core = facing * facing * facing;
          float a = clamp(vAlong, 0.0, 1.0);
          float along = smoothstep(0.0, 0.25, a) * a * sqrt(a);
          gl_FragColor = vec4(tint * 1.6, core * along * strength * 0.2);
        }`
      }
    />
  );
}

type Piece = {
  p: [number, number, number];
  v: [number, number, number];
  r: [number, number, number];
  w: number;
};

function spawn(high = true): Piece {
  return {
    p: [
      (Math.random() - 0.5) * 2.4,
      high ? 2.5 + Math.random() * 1.6 : 2.7,
      (Math.random() - 0.25) * 1.8,
    ],
    v: [(Math.random() - 0.5) * 0.5, -0.15 - Math.random() * 0.4, (Math.random() - 0.5) * 0.3],
    r: [Math.random() * 6, Math.random() * 6, Math.random() * 6],
    w: 2 + Math.random() * 5,
  };
}

/** Foil confetti. It flutters: sideways drift follows each piece's own spin. */
function Confetti() {
  const CONFETTI = useQualityStore.getState().profile.confetti;
  const mesh = useRef<InstancedMesh>(null);
  const pieces = useMemo(() => Array.from({ length: CONFETTI }, () => spawn()), [CONFETTI]);
  const dummy = useMemo(() => new Object3D(), []);
  const wasParty = useRef(false);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    for (let i = 0; i < CONFETTI; i++) m.setColorAt(i, c.set(FOIL[i % FOIL.length] ?? "#fff"));
  }, [CONFETTI]);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const party = useGameStore.getState().phase === "celebrate";
    if (party && !wasParty.current) {
      for (let i = 0; i < pieces.length; i++) pieces[i] = spawn();
    }
    wasParty.current = party;
    // after the party stops, let what's in the air finish falling
    const falling = pieces.some((pc) => pc.p[1] > 0.03);
    m.visible = party || (falling && useGameStore.getState().phase === "prize");
    if (!m.visible) return;

    const dt = Math.min(delta, 1 / 20);
    pieces.forEach((pc, i) => {
      pc.v[1] = Math.max(pc.v[1] - dt * 0.8, -0.75);
      pc.p[0] += (pc.v[0] + Math.sin(pc.r[0]) * 0.18) * dt;
      pc.p[1] += pc.v[1] * dt;
      pc.p[2] += (pc.v[2] + Math.cos(pc.r[1]) * 0.1) * dt;
      pc.r[0] += pc.w * dt;
      pc.r[1] += pc.w * 0.7 * dt;
      if (pc.p[1] < 0.02) {
        if (party) pieces[i] = spawn(false);
        else pc.p[1] = 0.012;
      }
      dummy.position.set(...pc.p);
      dummy.rotation.set(...pc.r);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, CONFETTI]}
      visible={false}
      frustumCulled={false}
    >
      <planeGeometry args={[0.02, 0.03]} />
      <meshStandardMaterial
        side={DoubleSide}
        metalness={0.9}
        roughness={0.25}
        envMapIntensity={2.2}
      />
    </instancedMesh>
  );
}
