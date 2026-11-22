"use client";

import { RoundedBox } from "@react-three/drei";
import { CABINET, CASE_TOP, MARQUEE } from "../config/dimensions";
import { getMaterials } from "../materials";
import { drawMarquee } from "../textures/art";
import { useArtTexture } from "../textures/useArtTexture";

/** Backlit header box with the wordmark, trimmed in deep pink. */
export function Marquee() {
  const m = getMaterials();
  const art = useArtTexture(2048, 320, drawMarquee);
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

      {/* lit face */}
      <mesh position={[0, cy, frontZ + 0.001]}>
        <planeGeometry args={[w - 0.05, MARQUEE.height - 0.035]} />
        <meshStandardMaterial
          map={art}
          emissiveMap={art}
          emissive="#ffffff"
          emissiveIntensity={0.62}
          color="#9a9a9a"
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* deep pink trim lips */}
      {[MARQUEE.bottom + 0.008, MARQUEE.bottom + MARQUEE.height - 0.008].map((y) => (
        <mesh key={y} material={m.hotPinkDeep} position={[0, y, frontZ + 0.006]}>
          <boxGeometry args={[w + 0.004, 0.016, 0.014]} />
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
