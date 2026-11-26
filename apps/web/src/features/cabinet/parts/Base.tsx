"use client";

import { BODY, CABINET, PLINTH, PRIZE_DOOR } from "../config/dimensions";
import { getMaterials } from "../materials";
import { drawBodyFront, drawCreditDisplay } from "../textures/art";
import { useArtTexture } from "../textures/useArtTexture";
import { PrizeDoor } from "./PrizeDoor";
import { useBezelGeometry, usePlateGeometry } from "./Trim";

const FRONT_Z = CABINET.depth / 2 - 0.04;
const BACK_Z = FRONT_Z - BODY.depth;
const KICK_H = 0.075;
const DECAL = { y0: PLINTH.height + KICK_H + 0.008, h: 0 };
DECAL.h = BODY.top - 0.004 - DECAL.y0;
const DRAW_DECAL = drawBodyFront({
  width: BODY.width,
  height: DECAL.h,
  door: {
    x: PRIZE_DOOR.x,
    y: PRIZE_DOOR.y - DECAL.y0 - DECAL.h / 2,
    w: PRIZE_DOOR.width + 0.03,
    h: PRIZE_DOOR.height + 0.03,
  },
});

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

      <FrontDecal />
      <CoinDoor />
      <PrizeDoor />

      {/* brushed kick plate with vents */}
      <mesh material={m.brushed} position={[0, PLINTH.height + KICK_H / 2, FRONT_Z + 0.003]}>
        <boxGeometry args={[BODY.width, KICK_H, 0.006]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={m.cavity} position={[0, PLINTH.height + 0.022 + i * 0.016, FRONT_Z + 0.0065]}>
          <boxGeometry args={[BODY.width - 0.2, 0.006, 0.002]} />
        </mesh>
      ))}
      <mesh material={m.hotPinkDeep} position={[0, PLINTH.height + KICK_H + 0.004, FRONT_Z + 0.003]}>
        <boxGeometry args={[BODY.width, 0.008, 0.008]} />
      </mesh>
    </group>
  );
}

const COIN = { y: 0.8, w: 0.5, h: 0.24 };
const DISPLAY = { w: 0.16, h: 0.064 };

/**
 * Coin door: a black gloss panel in a chrome bezel. Two coin mechs with lit
 * slots and reject buttons either side of a dot-matrix credit display, a keyed
 * lock at the edge.
 */
function CoinDoor() {
  const m = getMaterials();
  const panel = usePlateGeometry(COIN.w, COIN.h, 0.02, 0.022);
  const bezel = useBezelGeometry(COIN.w, COIN.h, 0.01, 0.026, 0.022);
  const mech = usePlateGeometry(0.07, 0.11, 0.01, 0.01);
  const screenBezel = useBezelGeometry(DISPLAY.w, DISPLAY.h, 0.006, 0.01, 0.008);
  const display = useArtTexture(1280, 512, drawCreditDisplay);
  return (
    <group position={[0, COIN.y, FRONT_Z]}>
      <mesh geometry={panel} material={m.blackGloss} castShadow />
      <mesh geometry={bezel} material={m.chrome} />

      {/* credit display */}
      <group position={[0, 0.012, 0.02]}>
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[DISPLAY.w, DISPLAY.h]} />
          <meshBasicMaterial map={display} toneMapped={false} color={[1.25, 1.25, 1.25]} />
        </mesh>
        <mesh material={m.glass} position={[0, 0, 0.004]}>
          <planeGeometry args={[DISPLAY.w, DISPLAY.h]} />
        </mesh>
        <mesh geometry={screenBezel} material={m.brushed} />
      </group>

      {[-0.165, 0.165].map((x) => (
        <group key={x} position={[x, 0, 0.02]}>
          {/* coin mech: brushed plate, lit slot, chrome reject button */}
          <mesh geometry={mech} material={m.brushed} position={[0, 0, 0]} />
          <mesh position={[0, 0.022, 0.0105]}>
            <planeGeometry args={[0.03, 0.046]} />
            <meshStandardMaterial color="#101014" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.022, 0.011]}>
            <planeGeometry args={[0.0055, 0.034]} />
            <meshBasicMaterial color={[3, 0.9, 1.7]} toneMapped={false} />
          </mesh>
          <mesh material={m.chrome} position={[0, -0.03, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0125, 0.0135, 0.006, 28]} />
          </mesh>
          <mesh material={m.hotPink} position={[0, -0.03, 0.0158]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0088, 0.0088, 0.004, 24]} />
          </mesh>
          {/* fixing screws */}
          {[
            [-0.027, 0.047],
            [0.027, 0.047],
            [-0.027, -0.047],
            [0.027, -0.047],
          ].map(([sx, sy]) => (
            <mesh key={`${sx}${sy}`} material={m.chrome} position={[sx, sy, 0.011]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.002, 10]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* keyed lock */}
      <group position={[0.23, -0.085, 0.02]}>
        <mesh material={m.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 0.006, 24]} />
        </mesh>
        <mesh material={m.cavity} position={[0, 0, 0.0032]}>
          <boxGeometry args={[0.0018, 0.008, 0.0005]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The body's printed front: lacquer blush with a soft glow and two pinstripe
 * rings framing the prize door, edge pinstripes and a clear window cut where
 * the door opens.
 */
function FrontDecal() {
  const art = useArtTexture(2048, Math.round((2048 * DECAL.h) / BODY.width), DRAW_DECAL);
  return (
    <mesh position={[0, DECAL.y0 + DECAL.h / 2, FRONT_Z + 0.0008]}>
      <planeGeometry args={[BODY.width - 0.004, DECAL.h]} />
      <meshPhysicalMaterial map={art} alphaTest={0.5} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.12} />
    </mesh>
  );
}
