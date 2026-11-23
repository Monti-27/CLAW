"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  type CanvasTexture,
  Color,
  DoubleSide,
  type Mesh,
  ShaderMaterial,
} from "three";
import { useGameStore } from "@/stores/game.store";
import { useQualityStore } from "@/stores/quality.store";
import { InkWall, useSign, WALL_GLSL, WALL_R, wallUniforms } from "./InkWall";
import { MOODS, mood } from "./mood";
import { TURNTABLE_RADIUS } from "./Turntable";

/** The cabinet stands on a low stage; the hall floor is this far below it. */
export const STAGE_HEIGHT = 0.09;
const FLOOR_Y = -STAGE_HEIGHT;
/** Fog / horizon color, in linear space. Sky, floor and architecture all fade to it. */
const HAZE = new Color(0.03, 0.021, 0.038);

/* ------------------------------------------------------------------ shaders */

const NOISE = /* glsl */ `
  float sq(float x) { return x * x; }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
`;

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** Haze, drifting bands, three slow searchlight shafts and a few twinkling specks. */
const skyShader = () =>
  new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: mood.time,
      uEnergy: mood.energy,
      uPace: mood.pace,
      uTint: { value: mood.tint },
      uHaze: { value: HAZE },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vDir = w.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * w;
        gl_Position.z = gl_Position.w; // pin to the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uEnergy; uniform float uPace;
      uniform vec3 uTint; uniform vec3 uHaze;
      varying vec3 vDir;
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        float az = atan(d.x, d.z);
        vec3 top = vec3(0.002, 0.001, 0.003);
        vec3 col = mix(uHaze * 1.3, top, smoothstep(-0.02, 0.5, h));

        // slow haze bands near the horizon
        vec2 uv = vec2(az * 2.2, h * 3.2);
        float n = noise(uv * 1.4 + vec2(uTime * 0.025, 0.0)) * 0.6
                + noise(uv * 3.3 - vec2(uTime * 0.04, uTime * 0.01)) * 0.4;
        col += vec3(0.035, 0.016, 0.032) * n * smoothstep(0.65, 0.0, h);

        // searchlight shafts falling from the dark
        for (int k = 0; k < 3; k++) {
          float fk = float(k);
          float a = sin(uTime * 0.06 * uPace + fk * 2.1) * 1.1 + fk * 2.09;
          float da = abs(atan(sin(az - a), cos(az - a)));
          float width = 0.05 + 0.04 * h;
          float beam = exp(-da * da / (width * width)) * smoothstep(-0.05, 0.45, h) * smoothstep(1.0, 0.5, h);
          col += uTint * beam * (0.025 + 0.08 * uEnergy);
        }

        // a soft glow pool behind the portal (straight back from the stage)
        float back = exp(-sq(atan(sin(az - 3.04), cos(az - 3.04)) * 2.2)) * exp(-sq((h - 0.12) * 5.0));
        col += uTint * back * (0.06 + 0.06 * uEnergy);

        // specks of light, twinkling
        vec2 g = vec2(az * 48.0, h * 48.0);
        float s = hash(floor(g));
        float tw = step(0.993, s) * (0.5 + 0.5 * sin(uTime * (1.5 + s * 3.0) + s * 40.0));
        col += vec3(1.0, 0.8, 0.9) * tw * smoothstep(0.08, 0.5, h) * 0.5;

        col = mix(col, uHaze, smoothstep(0.02, -0.2, h));
        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
  });

/**
 * Honed stone tiles under a polished finish. The finish reflects the ink
 * wall for real: each pixel bounces the view ray off the floor, hits the
 * same cylinder the wall is drawn on, and shades that point. Plus the
 * chaser ring around the stage and the key light's pool.
 */
const floorShader = (sign: CanvasTexture) =>
  new ShaderMaterial({
    fog: false,
    uniforms: {
      ...wallUniforms(sign),
      uHaze: { value: HAZE },
      uRing: { value: TURNTABLE_RADIUS + 0.55 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${WALL_GLSL}
      uniform float uRing; uniform vec3 uHaze;
      varying vec3 vWorld;
      void main() {
        vec2 xz = vWorld.xz;
        vec2 p = xz / 1.25 + vec2(0.52, 1.24);
        vec2 f = fract(p);
        float seam = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
        float line = 1.0 - smoothstep(0.0, 0.01, seam);
        float tone = 0.007 + w_hash(floor(p)) * 0.004 + w_noise(xz * 3.0) * 0.002;
        vec3 col = vec3(tone * 1.05, tone * 0.92, tone * 1.18) * (1.0 - line * 0.6);

        vec3 toCam = cameraPosition - vWorld;
        vec3 V = normalize(vWorld - cameraPosition);
        // mirror the view ray and find where it meets the wall
        vec3 R = vec3(V.x, -V.y, V.z);
        vec2 d = normalize(R.xz + 1e-5);
        float b = dot(xz, d);
        float c = dot(xz, xz) - WALL_R * WALL_R;
        float t = -b + sqrt(max(b * b - c, 0.0));
        float yh = vWorld.y + R.y / max(length(R.xz), 1e-3) * t;
        vec2 hit = xz + d * t;
        // a faint ripple in the finish so the reflection reads as a floor, not a mirror
        float th = atan(hit.x, hit.y) + (w_noise(xz * 4.0) - 0.5) * 0.004;
        vec3 refl = wallColor(th, yh);
        float fres = 0.18 + 0.55 * pow(1.0 - max(-V.y, 0.0), 3.0);
        col += refl * fres * (1.0 - line * 0.5) * 0.6;

        // chaser ring around the stage
        float r = length(xz);
        float ang = atan(xz.y, xz.x);
        float ring = exp(-w_sq((r - uRing) * 14.0));
        float chase = 0.5 + 0.5 * sin(ang * 4.0 - uTime * 1.3 * uPace);
        col += uTint * ring * (0.12 + 0.35 * uEnergy) * (0.4 + 0.6 * chase);
        col += uTint * exp(-w_sq((r - uRing) * 2.0)) * (0.02 + 0.03 * uEnergy);

        // the overhead lamp's pool: bright round the stage, falling off softly
        col += mix(vec3(1.0, 0.9, 0.88), uTint, 0.3) * 0.05 * exp(-dot(xz, xz) * 0.12) * (0.8 + 0.4 * uEnergy);
        // key light pool, front right of the cabinet
        col += vec3(0.05, 0.036, 0.034) * exp(-dot(xz - vec2(0.8, 1.4), xz - vec2(0.8, 1.4)) * 0.22);

        col = mix(col, uHaze * 0.6, smoothstep(9.0, 22.0, length(toCam)) * 0.6);
        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
  });

/* ---------------------------------------------------------------- the hall */

/** Eases the shared mood toward the current phase. Runs before everything that reads it. */
function MoodDriver() {
  const goal = useMemo(() => new Color(), []);
  useFrame((state, delta) => {
    const t = MOODS[useGameStore.getState().phase];
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 2.4);
    goal.setRGB(...t.tint);
    mood.tint.lerp(goal, k);
    mood.energy.value += (t.energy - mood.energy.value) * k;
    mood.pace.value += (t.pace - mood.pace.value) * k;
    mood.time.value = state.clock.elapsedTime;
  }, -1);
  return null;
}

/**
 * The hall: a round room walled in fluted glass with ink drifting behind it
 * (the boot screen, carried into the arena) and "claw × magicblock" glowing
 * through. A polished floor reflects it. The whole background is a handful
 * of draw calls and no lights; it reacts to the game through the shared mood.
 */
export function World() {
  const dust = useQualityStore((s) => s.profile.dust);
  const sky = useMemo(skyShader, []);
  const sign = useSign();
  const sky_ = useRef<Mesh>(null);

  // keep the sky dome centered on the camera so it reads as infinitely far
  useFrame(({ camera }) => sky_.current?.position.copy(camera.position));

  return (
    <>
      <MoodDriver />
      <color attach="background" args={[HAZE]} />
      <fog attach="fog" args={[HAZE, 9, 26]} />
      <mesh ref={sky_} material={sky} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[40, 32, 16]} />
      </mesh>
      <InkWall sign={sign} floorY={FLOOR_Y} />
      <Floor sign={sign} />
      <StageBase />
      <LightShaft />
      <Sparkles
        count={dust}
        scale={[10, 4.5, 10]}
        position={[0, 2.2, 0]}
        size={1.6}
        speed={0.18}
        opacity={0.4}
        color="#f3dcea"
      />
    </>
  );
}

function Floor({ sign }: { sign: CanvasTexture }) {
  const material = useMemo(() => floorShader(sign), [sign]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} material={material}>
      <circleGeometry args={[WALL_R + 0.5, 64]} />
    </mesh>
  );
}

/** The fixed part of the stage: plinth, inlaid ring, and a light channel that breathes with the game. */
function StageBase() {
  const r = TURNTABLE_RADIUS;
  const channel = useRef<Mesh>(null);
  useFrame(() => {
    const mat = channel.current?.material as { color?: Color } | undefined;
    mat?.color?.copy(mood.tint).multiplyScalar(1.4 + mood.energy.value * 1.6);
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.003, 0]} receiveShadow>
        <ringGeometry args={[r + 0.42, r + 0.62, 72]} />
        <meshStandardMaterial color="#39333f" metalness={0.8} roughness={0.36} />
      </mesh>
      <mesh position={[0, FLOOR_Y / 2 + 0.01, 0]} receiveShadow>
        <cylinderGeometry args={[r + 0.18, r + 0.32, STAGE_HEIGHT - 0.02, 72, 1]} />
        <meshStandardMaterial color="#1d1a21" metalness={0.35} roughness={0.42} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} receiveShadow>
        <ringGeometry args={[r, r + 0.18, 72]} />
        <meshStandardMaterial color="#1a171e" metalness={0.35} roughness={0.34} />
      </mesh>
      <mesh ref={channel} rotation={[Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.046, 0]}>
        <torusGeometry args={[r + 0.305, 0.008, 6, 96]} />
        <meshBasicMaterial color={[2.2, 1.9, 2.1]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Light falling from an unseen lamp high above the stage, as it looks in
 * haze: a soft shaft, widest and faintest at the floor, with slow motes of
 * brightness drifting down it. Drawn as camera-facing sheets (no geometry
 * edges or caps to catch the eye from any angle): one behind the machine as
 * a back-glow, a fainter one in front of it.
 */
function LightShaft() {
  const material = (strength: number, offset: number) =>
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
      toneMapped: false,
      uniforms: { uTime: mood.time, uTint: { value: mood.tint }, uEnergy: mood.energy, uStrength: { value: strength }, uOffset: { value: offset } },
      vertexShader: /* glsl */ `
        uniform float uOffset;
        varying vec2 vUv;
        void main() {
          vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 toCam = cameraPosition - center; toCam.y = 0.0;
          vec3 fwd = normalize(toCam + vec3(1e-4, 0.0, 0.0));
          vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
          // sheet is 1x1; scaled here to 5.2m wide at the floor, 8m tall
          vec3 world = center + fwd * uOffset + side * position.x * 5.2 + vec3(0.0, position.y * 8.0, 0.0);
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uTint; uniform float uEnergy; uniform float uStrength;
        varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main() {
          float y = vUv.y;                       // 0 floor, 1 lamp
          float halfW = mix(0.5, 0.07, y);        // narrow at the lamp, wide at the floor
          float x = abs(vUv.x - 0.5) / halfW;
          float body = exp(-x * x * 2.6);          // gaussian falloff, no edge anywhere
          float along = smoothstep(1.0, 0.82, y) * (0.25 + 0.75 * smoothstep(0.0, 0.85, y)) * smoothstep(0.0, 0.12, y);
          // haze is never even: slow vertical motes drifting down the shaft
          float motes = 0.65 + 0.35 * n(vec2(vUv.x * 7.0, y * 3.0 + uTime * 0.12)) * n(vec2(vUv.x * 3.0 + 4.0, y * 1.5 + uTime * 0.05));
          vec3 col = mix(vec3(1.0, 0.9, 0.88), uTint, 0.3) * body * along * motes * (0.05 + 0.02 * uEnergy) * uStrength;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  const back = useMemo(() => material(1, -0.7), []);
  const front = useMemo(() => material(0.35, 1.4), []);
  return (
    <group position={[0, FLOOR_Y + 4, 0]}>
      <mesh material={back} frustumCulled={false} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh material={front} frustumCulled={false} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}
