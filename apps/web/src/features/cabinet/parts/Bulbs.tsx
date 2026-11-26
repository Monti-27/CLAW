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
import { BODY, CABINET, CASE_TOP, MARQUEE, MARQUEE_BAND, TOWER } from "../config/dimensions";
import { getMaterials } from "../materials";

type Vec3 = [number, number, number];

/** Marquee rims, the glass top rail and both tower edges, like a real cabinet's chaser lights. */
function bulbPositions(): Vec3[] {
  const out: Vec3[] = [];
  const mw = CABINET.width + MARQUEE.overhang * 2 - 0.06;
  const mz = (CABINET.depth + MARQUEE.overhang) / 2 + MARQUEE.overhang / 2 + 0.008;
  const row = (y: number, z: number, width: number, step: number) => {
    const n = Math.round(width / step);
    for (let i = 0; i <= n; i++) out.push([-width / 2 + (i * width) / n, y, z]);
  };
  // on the lacquer bands above and below the lit face
  row(MARQUEE.bottom + MARQUEE.height - MARQUEE_BAND / 2, mz, mw, 0.066);
  row(MARQUEE.bottom + MARQUEE_BAND / 2, mz, mw, 0.066);
  row(CASE_TOP - 0.012, CABINET.depth / 2 + 0.012, CABINET.width - 0.06, 0.08);

  const towerZ = CABINET.depth / 2 - 0.04 + TOWER.protrude + 0.014;
  for (const side of [-1, 1]) {
    const cx = side * (BODY.width / 2 + TOWER.width / 2);
    for (const e of [-1, 1]) {
      const x = cx + e * (TOWER.width / 2 - 0.006);
      for (let y = 0.14; y < TOWER.height - 0.03; y += 0.068) out.push([x, y, towerZ]);
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

/**
 * The glass globe. Lit from inside, so it is brightest face-on (where you look
 * through to the filament) and falls off toward the rim, which keeps a thin
 * coloured edge; a fixed studio highlight sells the glass. Unlit, it reads as
 * clear tinted glass rather than a flat dot.
 */
function globeMaterial() {
  return new ShaderMaterial({
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vColor;
      void main() {
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vColor;
      void main() {
        vec3 n = normalize(vN);
        float ndv = clamp(dot(n, vV), 0.0, 1.0);
        float lit = clamp(max(vColor.r, max(vColor.g, vColor.b)), 0.0, 6.0);
        // filament glow through the glass, hotter and whiter at the centre
        float core = pow(ndv, 2.6);
        vec3 col = vColor * (0.32 + 0.9 * core) + vec3(core * core) * 0.35 * lit;
        // unlit glass: a cool tint so it never goes black
        col += vec3(0.16, 0.13, 0.15) * (1.0 - min(1.0, lit)) * (0.4 + 0.6 * ndv);
        // studio highlight and a soft rim
        vec3 l = normalize(vec3(-0.45, 0.75, 0.55));
        float spec = pow(max(dot(n, normalize(l + vV)), 0.0), 70.0);
        col += vec3(1.0) * spec * 1.4 + vColor * pow(1.0 - ndv, 3.0) * 0.25;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export function Bulbs() {
  const m_ = getMaterials();
  const socket = useRef<InstancedMesh>(null);
  const globeMat = useMemo(globeMaterial, []);
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
      // the socket sits behind the globe, facing out
      o.position.z -= 0.0062;
      o.rotation.set(Math.PI / 2, 0, 0);
      o.updateMatrix();
      socket.current?.setMatrixAt(i, o.matrix);
      o.rotation.set(0, 0, 0);
    });
    m.instanceMatrix.needsUpdate = true;
    if (halo.current) halo.current.instanceMatrix.needsUpdate = true;
    if (socket.current) socket.current.instanceMatrix.needsUpdate = true;
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
      {/* the glass bulb: lit from inside, its hot core is what bloom picks up */}
      <instancedMesh ref={mesh} args={[undefined, globeMat, positions.length]}>
        <sphereGeometry args={[0.0102, 18, 12]} />
      </instancedMesh>
      {/* chrome cup and collar each bulb screws into */}
      <instancedMesh ref={socket} args={[undefined, m_.chrome, positions.length]}>
        <cylinderGeometry args={[0.0118, 0.0098, 0.007, 18, 1]} />
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
