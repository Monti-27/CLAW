"use client";

import { CHUTE, PLAYFIELD } from "../config/dimensions";
import { getMaterials } from "../materials";

/** Acrylic drop chute with a pink rim. One per player lane. */
export function Chute({ side }: { side: -1 | 1 }) {
  const m = getMaterials();
  const x = side * Math.abs(CHUTE.x);
  return (
    <group position={[x, PLAYFIELD.floor, CHUTE.z]}>
      <mesh material={m.acrylic} position={[0, CHUTE.height / 2, 0]}>
        <cylinderGeometry args={[CHUTE.radius, CHUTE.radius, CHUTE.height, 48, 1, true]} />
      </mesh>
      <mesh material={m.hotPink} position={[0, CHUTE.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CHUTE.radius, 0.008, 12, 48]} />
      </mesh>
      {/* the drop hole: a dark throat a prize falls through to the door below */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <circleGeometry args={[CHUTE.radius - 0.004, 40]} />
        <meshBasicMaterial color="#050307" />
      </mesh>
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[CHUTE.radius - 0.004, CHUTE.radius - 0.03, 0.08, 40, 1, true]} />
        <meshStandardMaterial color="#0d0910" roughness={0.9} side={1} />
      </mesh>
      <mesh material={m.chrome} position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CHUTE.radius - 0.004, CHUTE.radius + 0.012, 48]} />
      </mesh>
    </group>
  );
}
