"use client";

import { RoundedBox } from "@react-three/drei";
import { BODY, CABINET, PLINTH, TOWER } from "../config/dimensions";
import { getMaterials } from "../materials";
import { drawTowerPanel } from "../textures/art";
import { useArtTexture } from "../textures/useArtTexture";

type Side = -1 | 1;

const H = TOWER.height - PLINTH.height;
const FRONT_Z = CABINET.depth / 2 - 0.04 + TOWER.protrude;

/** Side tower: hot pink shell, blush front, pinstripe hourglass panel. */
export function Tower({ side }: { side: Side }) {
  const m = getMaterials();
  const art = useArtTexture(256, 512, drawTowerPanel);
  const x = side * (BODY.width / 2 + TOWER.width / 2);
  const depth = CABINET.depth - 0.04 + TOWER.protrude;
  const z = FRONT_Z - depth / 2;

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

      {/* hourglass pinstripe panel */}
      <mesh position={[0, PLINTH.height + H * 0.62, FRONT_Z + 0.006]}>
        <planeGeometry args={[TOWER.width - 0.07, H * 0.5]} />
        <meshPhysicalMaterial map={art} roughness={0.3} clearcoat={0.7} />
      </mesh>

      {/* chrome edge trims on the front corners */}
      {[-1, 1].map((e) => (
        <mesh
          key={e}
          material={m.chrome}
          position={[e * (TOWER.width / 2 - 0.006), PLINTH.height + H / 2, FRONT_Z + 0.004]}
        >
          <boxGeometry args={[0.008, H, 0.01]} />
        </mesh>
      ))}

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

      {/* coin return slot */}
      <mesh material={m.plinth} position={[0, TOWER.height - 0.1, FRONT_Z + 0.006]}>
        <boxGeometry args={[0.05, 0.03, 0.004]} />
      </mesh>
    </group>
  );
}
