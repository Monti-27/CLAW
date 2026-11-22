"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  type InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { type GamePhase, useGameStore } from "@/stores/game.store";
import { BODY, CABINET, CASE_TOP, MARQUEE, TOWER } from "../config/dimensions";

type Vec3 = [number, number, number];

/** Marquee rims, the glass top rail and both tower edges, like a real cabinet's chaser lights. */
function bulbPositions(): Vec3[] {
  const out: Vec3[] = [];
  const mw = CABINET.width + MARQUEE.overhang * 2 - 0.06;
  const mz = (CABINET.depth + MARQUEE.overhang) / 2 + MARQUEE.overhang / 2 + 0.02;
  const row = (y: number, z: number, width: number, step: number) => {
    const n = Math.round(width / step);
    for (let i = 0; i <= n; i++) out.push([-width / 2 + (i * width) / n, y, z]);
  };
  row(MARQUEE.bottom + MARQUEE.height - 0.006, mz, mw, 0.066);
  row(MARQUEE.bottom + 0.006, mz, mw, 0.066);
  row(CASE_TOP - 0.012, CABINET.depth / 2 + 0.012, CABINET.width - 0.06, 0.08);

  const towerZ = CABINET.depth / 2 - 0.04 + TOWER.protrude + 0.012;
  for (const side of [-1, 1]) {
    const cx = side * (BODY.width / 2 + TOWER.width / 2);
    for (const e of [-1, 1]) {
      const x = cx + e * (TOWER.width / 2 - 0.006);
      for (let y = 0.16; y < TOWER.height - 0.04; y += 0.075) out.push([x, y, towerZ]);
    }
  }
  return out;
}

const WARM = new Color("#ffd9b0");
const PINK = new Color("#ff5a9c");
const WHITE = new Color("#fff6ea");
const tmp = new Color();

/** Cheap per-bulb hash so twinkles don't march in step. */
const hash = (i: number, t: number) =>
  Math.abs(Math.sin(i * 127.1 + Math.floor(t) * 311.7) * 43758.5453) % 1;

/** Per-bulb color for the current phase. Values above 1 feed the bloom pass. */
function paint(phase: GamePhase, i: number, t: number, out: Color) {
  switch (phase) {
    case "attract": {
      // a slow warm wave travelling along each run
      const wave = Math.sin(t * 2.2 - i * 0.42) * 0.5 + 0.5;
      return out.copy(WARM).multiplyScalar(0.5 + wave ** 3 * 2.4);
    }
    case "intro":
    case "playing": {
      // lit steady like a cabinet on the floor, with a slow breath running through
      const wave = Math.sin(t * 1.4 - i * 0.22) * 0.5 + 0.5;
      return out.copy(WARM).multiplyScalar(1.15 + wave * 0.55);
    }
    case "grabbing": {
      const wave = Math.sin(t * 7 - i * 0.5) * 0.5 + 0.5;
      return out.copy(PINK).multiplyScalar(0.35 + wave ** 2 * 2.4);
    }
    case "lost": {
      const fade = Math.sin(t * 3.2) * 0.5 + 0.5;
      return out.copy(PINK).multiplyScalar(0.15 + fade * 0.5);
    }
    case "celebrate": {
      // two-step chase, warm then pink, with white flashes on random bulbs
      const step = Math.floor(t * 11);
      if (hash(i, t * 14) > 0.9) return out.copy(WHITE).multiplyScalar(6);
      return out
        .copy((i + step) % 2 === 0 ? WARM : PINK)
        .multiplyScalar((i + step) % 2 === 0 ? 3.4 : 1.6);
    }
    case "prize": {
      const wave = Math.sin(t * 3 - i * 0.3) * 0.5 + 0.5;
      return out.copy(WARM).multiplyScalar(1.4 + wave * 1.6);
    }
  }
}

/**
 * The glow around each lamp: a camera-facing quad per bulb, all in one draw,
 * coloured by the same per-instance colour as the bulb so it chases with it.
 * Soft core plus a faint wide skirt, the way a lamp blooms through a lens.
 */
function haloMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        vUv = position.xy * 2.0;
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        // pull the quad slightly toward the camera so it never clips into its bulb
        c.xyz += normalize(-c.xyz) * 0.012;
        c.xy += position.xy * 0.085;
        gl_Position = projectionMatrix * c;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        float d = length(vUv);
        float core = exp(-d * d * 38.0);
        float skirt = exp(-d * 5.5) * 0.16;
        float a = (core + skirt) * smoothstep(1.0, 0.7, d);
        gl_FragColor = vec4(vColor * a * 0.55, 1.0);
      }`,
  });
}

export function Bulbs() {
  const halo = useRef<InstancedMesh>(null);
  const haloGeo = useMemo(() => new PlaneGeometry(1, 1), []);
  const haloMat = useMemo(haloMaterial, []);
  const positions = useMemo(bulbPositions, []);
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new Object3D();
    positions.forEach((p, i) => {
      o.position.set(...p);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, WARM);
      halo.current?.setMatrixAt(i, o.matrix);
      halo.current?.setColorAt(i, WARM);
    });
    m.instanceMatrix.needsUpdate = true;
    if (halo.current) halo.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m?.instanceColor) return;
    const phase = useGameStore.getState().phase;
    const t = state.clock.elapsedTime;
    const n = positions.length;
    const h = halo.current;
    for (let i = 0; i < n; i++) {
      paint(phase, i, t, tmp);
      m.setColorAt(i, tmp);
      h?.setColorAt(i, tmp);
    }
    m.instanceColor.needsUpdate = true;
    if (h?.instanceColor) h.instanceColor.needsUpdate = true;
  });

  return (
    <>
      {/* the glass bulb: a hot core that the bloom pass picks up */}
      <instancedMesh ref={mesh} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[0.0082, 14, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={halo}
        args={[haloGeo, haloMat, positions.length]}
        frustumCulled={false}
        renderOrder={5}
      />
    </>
  );
}
