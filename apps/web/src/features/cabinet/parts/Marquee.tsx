"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshBasicMaterial } from "three";
import { useGameStore } from "@/stores/game.store";
import { CABINET, CASE_TOP, MARQUEE, MARQUEE_BAND } from "../config/dimensions";
import { getMaterials } from "../materials";
import { drawMarquee } from "../textures/art";
import { useArtTexture } from "../textures/useArtTexture";

const FACE_H = MARQUEE.height - MARQUEE_BAND * 2;
const BEZEL = 0.012;

/** Header box: a neon sign in a chrome bezel, lacquer bands carrying the chaser bulbs. */
export function Marquee() {
  const m = getMaterials();
  const w0 = CABINET.width + MARQUEE.overhang * 2;
  const art = useArtTexture(4096, Math.round((4096 * FACE_H) / (w0 - 0.07)), drawMarquee);
  const face = useRef<MeshBasicMaterial>(null);
  const level = useRef(1);

  // the sign breathes slightly, flickers up on a win and dims on a miss
  useFrame((state, delta) => {
    const phase = useGameStore.getState().phase;
    const goal = phase === "celebrate" ? 1.9 : phase === "lost" ? 0.75 : phase === "prize" ? 1.4 : 1.15;
    level.current += (goal - level.current) * Math.min(1, delta * 3);
    const t = state.clock.elapsedTime;
    const hum = 1 + Math.sin(t * 2.1) * 0.025 + (phase === "celebrate" ? Math.sin(t * 22) * 0.12 : 0);
    face.current?.color.setScalar(level.current * hum);
  });
  const w = CABINET.width + MARQUEE.overhang * 2;
  const d = CABINET.depth + MARQUEE.overhang;
  const cy = MARQUEE.bottom + MARQUEE.height / 2;
  const frontZ = d / 2 + MARQUEE.overhang / 2;

  return (
    <group>
      {/* dark band between glass and header */}
      <mesh material={m.darkGlass} position={[0, (CASE_TOP + MARQUEE.bottom) / 2, 0]}>
        <boxGeometry
          args={[CABINET.width + 0.01, MARQUEE.bottom - CASE_TOP, CABINET.depth + 0.01]}
        />
      </mesh>

      <RoundedBox
        args={[w, MARQUEE.height, d]}
        radius={0.03}
        smoothness={4}
        material={m.hotPink}
        position={[0, cy, MARQUEE.overhang / 2]}
      />

      {/* the neon sign, set into a chrome bezel */}
      <mesh position={[0, cy, frontZ + 0.002]}>
        <planeGeometry args={[w - 0.07, FACE_H]} />
        <meshBasicMaterial ref={face} map={art} toneMapped={false} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={m.chrome} position={[0, cy + s * (FACE_H / 2 + BEZEL / 2), frontZ + 0.004]}>
            <boxGeometry args={[w - 0.07 + BEZEL * 2, BEZEL, 0.01]} />
          </mesh>
          <mesh material={m.chrome} position={[s * ((w - 0.07) / 2 + BEZEL / 2), cy, frontZ + 0.004]}>
            <boxGeometry args={[BEZEL, FACE_H + BEZEL * 2, 0.01]} />
          </mesh>
        </group>
      ))}

      {/* deep pink lips at the top and bottom edges */}
      {[MARQUEE.bottom + 0.004, MARQUEE.bottom + MARQUEE.height - 0.004].map((y) => (
        <mesh key={y} material={m.hotPinkDeep} position={[0, y, frontZ - 0.002]}>
          <boxGeometry args={[w + 0.004, 0.008, 0.012]} />
        </mesh>
      ))}

      {/* cap */}
      <RoundedBox
        args={[w + 0.01, 0.018, d + 0.01]}
        radius={0.008}
        material={m.hotPinkDeep}
        position={[0, MARQUEE.bottom + MARQUEE.height + 0.009, MARQUEE.overhang / 2]}
      />
    </group>
  );
}
