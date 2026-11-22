"use client";

import { RoundedBox } from "@react-three/drei";
import { BODY, CABINET, PLINTH, PRIZE_DOOR } from "../config/dimensions";
import { getMaterials } from "../materials";
import { PrizeDoor } from "./PrizeDoor";

const FRONT_Z = CABINET.depth / 2 - 0.04;
const BACK_Z = FRONT_Z - BODY.depth;

/** Black plinth the machine stands on. */
export function Plinth() {
  const m = getMaterials();
  return (
    <mesh material={m.plinth} position={[0, PLINTH.height / 2, 0]} castShadow>
      <boxGeometry
        args={[CABINET.width - PLINTH.inset * 2, PLINTH.height, CABINET.depth - PLINTH.inset * 2]}
      />
    </mesh>
  );
}

/**
 * Center body between the towers. The front is built from four slabs around
 * a real opening, so the prize bin has depth instead of being a painted door.
 */
export function LowerBody() {
  const m = getMaterials();
  const { width: dw, height: dh, depth: dd, y: dy } = PRIZE_DOOR;
  const bottom = PLINTH.height;
  const top = BODY.top;
  const half = BODY.width / 2;
  const slabZ = FRONT_Z - dd / 2;
  const side = half - dw / 2;

  const slabs: { key: string; pos: [number, number, number]; size: [number, number, number] }[] = [
    {
      key: "back",
      pos: [0, (top + bottom) / 2, (BACK_Z + FRONT_Z - dd) / 2],
      size: [BODY.width, top - bottom, BODY.depth - dd],
    },
    {
      key: "left",
      pos: [-(dw / 2 + side / 2), (top + bottom) / 2, slabZ],
      size: [side, top - bottom, dd],
    },
    {
      key: "right",
      pos: [dw / 2 + side / 2, (top + bottom) / 2, slabZ],
      size: [side, top - bottom, dd],
    },
    { key: "top", pos: [0, (top + dy + dh / 2) / 2, slabZ], size: [dw, top - (dy + dh / 2), dd] },
    {
      key: "bottom",
      pos: [0, (bottom + dy - dh / 2) / 2, slabZ],
      size: [dw, dy - dh / 2 - bottom, dd],
    },
  ];

  return (
    <group>
      {slabs.map((s) => (
        <mesh key={s.key} material={m.blush} position={s.pos} castShadow receiveShadow>
          <boxGeometry args={s.size} />
        </mesh>
      ))}

      <CoinDoor />
      <PrizeDoor />

      {/* kick strip */}
      <mesh material={m.hotPinkDeep} position={[0, PLINTH.height + 0.02, FRONT_Z + 0.002]}>
        <boxGeometry args={[BODY.width, 0.04, 0.006]} />
      </mesh>
    </group>
  );
}

function CoinDoor() {
  const m = getMaterials();
  return (
    <group position={[0, 0.8, FRONT_Z]}>
      <RoundedBox
        args={[0.5, 0.25, 0.025]}
        radius={0.008}
        material={m.blushLight}
        position={[0, 0, 0.012]}
        castShadow
      />
      {[-0.11, 0.11].map((x) => (
        <group key={x} position={[x, -0.035, 0.026]}>
          {/* coin acceptor: brushed plate, lit slot, reject button */}
          <RoundedBox args={[0.06, 0.085, 0.008]} radius={0.004} material={m.brushed} />
          <mesh position={[0, 0.012, 0.0045]}>
            <boxGeometry args={[0.006, 0.034, 0.002]} />
            <meshBasicMaterial color={[2.6, 0.9, 1.6]} toneMapped={false} />
          </mesh>
          <mesh material={m.hotPink} position={[0, -0.026, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.006, 20]} />
          </mesh>
        </group>
      ))}
      {[-0.11, 0.11].map((x) => (
        <mesh
          key={x}
          material={m.chrome}
          position={[x, 0.078, 0.027]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.008, 0.008, 0.008, 16]} />
        </mesh>
      ))}
      <mesh material={m.chrome} position={[0.215, 0, 0.032]}>
        <boxGeometry args={[0.012, 0.13, 0.012]} />
      </mesh>
    </group>
  );
}
