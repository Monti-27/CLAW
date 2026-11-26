"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { Color, ShaderMaterial } from "three";
import { mood } from "@/features/scene/mood";
import { BODY, CABINET, PLINTH, TOWER } from "../config/dimensions";
import { getMaterials } from "../materials";
import { drawGrille, drawPlayerPlate, drawSidePanel } from "../textures/art";
import { useArtTexture } from "../textures/useArtTexture";
import { useBezelGeometry, usePlateGeometry } from "./Trim";

type Side = -1 | 1;

const H = TOWER.height - PLINTH.height;
const FRONT_Z = CABINET.depth / 2 - 0.04 + TOWER.protrude;
/** the lit column on each tower front */
const LIGHT = { w: TOWER.width - 0.08, y0: 0.2, y1: 0.84 };
const LIGHT_H = LIGHT.y1 - LIGHT.y0;
const SPEAKER = { y: 0.968, r: 0.05 };
const PLATE = { y: 0.888, w: 0.15, h: 0.03 };
const KICK = { h: 0.075 };
const PLATE_ART = [drawPlayerPlate("PLAYER 1"), drawPlayerPlate("PLAYER 2")] as const;

/**
 * The light column: frosted acrylic lit from behind, with chevrons chasing
 * upward toward the glass (every claw machine points at its prizes). It reads
 * the hall's shared mood, so it idles calm, races while the claw drops and
 * turns gold on a win, all without any per-frame work here.
 */
function lightMaterial(side: Side) {
  return new ShaderMaterial({
    toneMapped: false,
    uniforms: {
      uTime: mood.time,
      uEnergy: mood.energy,
      uPace: mood.pace,
      uTint: { value: mood.tint },
      uSide: { value: side },
      uAspect: { value: LIGHT.w / LIGHT_H },
      uPlum: { value: new Color("#2a0d24") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uEnergy, uPace, uSide, uAspect;
      uniform vec3 uTint, uPlum;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        float x = (uv.x - 0.5) * uAspect;
        // backlight: deep plum, warmer up the middle like tubes behind frosted acrylic
        float spread = exp(-x * x * 14.0);
        // (values are linear: small numbers here are already a visible plum)
        vec3 hot = uTint * vec3(1.0, 0.25, 0.55);
        vec3 base = uPlum * (0.6 + 0.4 * uv.y) + hot * 0.035 * spread;
        // chevrons chasing up: a pink tube with a white-hot core
        float t = uTime * (0.35 + 0.25 * uPace);
        float c = fract(uv.y * 5.0 + abs(x) * 2.0 - t);
        float tube = smoothstep(0.0, 0.035, c) * (1.0 - smoothstep(0.15, 0.2, c));
        float core = smoothstep(0.05, 0.075, c) * (1.0 - smoothstep(0.11, 0.135, c));
        float e = min(uEnergy, 1.6);
        float lift = 0.45 + 0.55 * smoothstep(0.0, 1.0, uv.y);
        vec3 col = base + tube * hot * (0.8 + 1.0 * e) * lift
          + core * vec3(1.0, 0.7, 0.85) * (0.5 + 0.7 * e) * lift;
        // a slow sheen sweeping down the panel
        float sheen = exp(-pow((uv.y - fract(-uTime * 0.11 + uSide * 0.25)) * 7.0, 2.0));
        col += hot * 0.05 * sheen;
        // dark at the very edges, where the frame shades it
        vec2 ed = min(uv, 1.0 - uv);
        col *= smoothstep(0.0, 0.035, min(ed.x * uAspect, ed.y));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/** Side tower: lacquer shell, a lit chevron column, a speaker and a player plate. */
export function Tower({ side }: { side: Side }) {
  const m = getMaterials();
  const grille = useArtTexture(512, 512, drawGrille);
  const plateArt = useArtTexture(1024, 208, side < 0 ? PLATE_ART[0] : PLATE_ART[1]);
  const sideArt = useArtTexture(1280, 1600, drawSidePanel);
  const light = useMemo(() => lightMaterial(side), [side]);
  const bezel = useBezelGeometry(LIGHT.w, LIGHT_H, 0.012, 0.012, 0.018);
  const plate = usePlateGeometry(PLATE.w, PLATE.h, 0.006, 0.006);
  const x = side * (BODY.width / 2 + TOWER.width / 2);
  const depth = CABINET.depth - 0.04 + TOWER.protrude;
  const z = FRONT_Z - depth / 2;
  const outer = side * (TOWER.width / 2);

  return (
    <group position={[x, 0, 0]}>
      <RoundedBox
        args={[TOWER.width, H, depth]}
        radius={0.014}
        smoothness={3}
        material={m.hotPink}
        position={[0, PLINTH.height + H / 2, z]}
      />

      {/* blush front face */}
      <mesh material={m.blush} position={[0, PLINTH.height + H / 2, FRONT_Z + 0.002]}>
        <boxGeometry args={[TOWER.width - 0.03, H - 0.03, 0.004]} />
      </mesh>

      {/* the light column in a chrome bezel */}
      <group position={[0, (LIGHT.y0 + LIGHT.y1) / 2, FRONT_Z + 0.004]}>
        <mesh material={m.cavity} position={[0, 0, 0.0005]}>
          <planeGeometry args={[LIGHT.w + 0.012, LIGHT_H + 0.012]} />
        </mesh>
        <mesh material={light} position={[0, 0, 0.002]}>
          <planeGeometry args={[LIGHT.w, LIGHT_H]} />
        </mesh>
        <mesh geometry={bezel} material={m.chrome} />
      </group>

      {/* player plate */}
      <group position={[0, PLATE.y, FRONT_Z + 0.004]}>
        <mesh geometry={plate} material={m.blackGloss} />
        <mesh position={[0, 0, 0.0065]}>
          <planeGeometry args={[PLATE.w - 0.01, PLATE.h - 0.008]} />
          <meshBasicMaterial map={plateArt} toneMapped={false} />
        </mesh>
      </group>

      {/* speaker: perforated grille in a chrome ring */}
      <group position={[0, SPEAKER.y, FRONT_Z + 0.004]}>
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[SPEAKER.r, 48]} />
          <meshStandardMaterial map={grille} roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh material={m.chrome} position={[0, 0, 0.003]}>
          <torusGeometry args={[SPEAKER.r + 0.003, 0.0045, 12, 64]} />
        </mesh>
      </group>

      {/* chrome channels on the front corners: the bulb runs are fixed into these */}
      {[-1, 1].map((e) => (
        <mesh
          key={e}
          material={m.chrome}
          position={[e * (TOWER.width / 2 - 0.006), PLINTH.height + H / 2, FRONT_Z + 0.004]}
        >
          <boxGeometry args={[0.016, H, 0.012]} />
        </mesh>
      ))}

      {/* brushed kick plate with vents */}
      <mesh material={m.brushed} position={[0, PLINTH.height + KICK.h / 2, FRONT_Z + 0.005]}>
        <boxGeometry args={[TOWER.width - 0.034, KICK.h, 0.006]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={m.cavity} position={[0, PLINTH.height + 0.022 + i * 0.016, FRONT_Z + 0.0085]}>
          <boxGeometry args={[TOWER.width - 0.1, 0.006, 0.002]} />
        </mesh>
      ))}

      {/* outer side: the lacquer decal */}
      <mesh
        position={[outer + side * 0.0012, PLINTH.height + H / 2 + 0.01, z]}
        rotation={[0, (side * Math.PI) / 2, 0]}
      >
        <planeGeometry args={[depth - 0.05, H - 0.07]} />
        <meshPhysicalMaterial map={sideArt} roughness={0.3} clearcoat={0.9} clearcoatRoughness={0.1} />
      </mesh>

      {/* top cap with a cup well */}
      <RoundedBox
        args={[TOWER.width + 0.01, 0.022, depth + 0.01]}
        radius={0.008}
        material={m.blushLight}
        position={[0, TOWER.height + 0.011, z]}
      />
      <mesh material={m.interior} position={[-side * 0.04, TOWER.height + 0.024, FRONT_Z - 0.09]}>
        <cylinderGeometry args={[0.045, 0.045, 0.006, 32]} />
      </mesh>
    </group>
  );
}
