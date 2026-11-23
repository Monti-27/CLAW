"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import {
  LatheGeometry,
  Matrix4,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  Vector2,
} from "three";
import { getMaterials } from "../materials";
import { drawCoin, drawPrizeBox } from "../textures/art";
import { paintTexture, repaint } from "../textures/canvas";
import { Capsules } from "./Batch";
import { capsuleKit, gemMaterial } from "./shapes";
import { BOX_PRIZES, type BoxPrizeKey, COIN_LABELS, type CoinLabel } from "./catalog";
import { BOX_SIZE, CAPSULE_R, COIN, GEM_R, type PlacedPrize } from "./layout";

function createPrizeMaterials() {
  const repaints: (() => void)[] = [];
  const canvas = (w: number, h: number, draw: Parameters<typeof paintTexture>[2], data = false) => {
    const t = paintTexture(w, h, draw);
    if (data) t.colorSpace = NoColorSpace;
    repaints.push(() => repaint(t, draw));
    return t;
  };

  const boxes = {} as Record<
    BoxPrizeKey,
    { face: MeshPhysicalMaterial; body: MeshPhysicalMaterial }
  >;
  for (const k of Object.keys(BOX_PRIZES) as BoxPrizeKey[]) {
    const p = BOX_PRIZES[k];
    const foil = canvas(416, 528, drawPrizeBox(p, "foil"), true);
    boxes[k] = {
      // foil map: green = roughness, blue = metalness
      face: new MeshPhysicalMaterial({
        map: canvas(416, 528, drawPrizeBox(p, "color")),
        roughnessMap: foil,
        metalnessMap: foil,
        roughness: 1,
        metalness: 1,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.6,
      }),
      body: new MeshPhysicalMaterial({
        color: p.body,
        roughness: 0.5,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
      }),
    };
  }

  const coins = {} as Record<CoinLabel, MeshStandardMaterial>;
  for (const label of COIN_LABELS) {
    coins[label] = new MeshStandardMaterial({
      map: canvas(256, 256, drawCoin(label, "color")),
      bumpMap: canvas(256, 256, drawCoin(label, "bump"), true),
      bumpScale: 2.5,
      metalness: 1,
      roughness: 0.26,
      envMapIntensity: 1.5,
    });
  }

  // canvas art painted before the self-hosted fonts loaded gets redrawn once
  document.fonts.ready.then(() => {
    for (const r of repaints) r();
  });

  return { boxes, coins };
}

let cache: ReturnType<typeof createPrizeMaterials> | null = null;
export const getPrizeMaterials = () => {
  cache ??= createPrizeMaterials();
  return cache;
};

/** Coin blank with a raised rim, turned on a lathe. */
function coinGeometry() {
  const { r, h } = COIN;
  const rim = r * 0.1;
  const dip = h * 0.22;
  const profile = [
    [0, h / 2 - dip],
    [r - rim * 1.4, h / 2 - dip],
    [r - rim, h / 2],
    [r - 0.0008, h / 2],
    [r, h / 2 - 0.0008],
    [r, -h / 2 + 0.0008],
    [r - 0.0008, -h / 2],
    [r - rim, -h / 2],
    [r - rim * 1.4, -h / 2 + dip],
    [0, -h / 2 + dip],
  ].map(([x, y]) => new Vector2(x, y));
  // faces point outward when the profile runs bottom to top
  return new LatheGeometry(profile.reverse(), 56);
}
let coinGeo: LatheGeometry | null = null;
export const getCoinGeometry = () => {
  coinGeo ??= coinGeometry();
  return coinGeo;
};

/** A prize drawn at its own origin. Callers place it (pile, claw, prize bin). */
export function PrizeMesh({ prize }: { prize: PlacedPrize }) {
  switch (prize.kind) {
    case "box":
      return <Box prize={prize.prize} />;
    case "capsule":
      return <Capsule id={prize.id} color={prize.color} />;
    case "coin":
      return <Coin label={prize.label} />;
    case "gem":
      return <Gem color={prize.color} />;
  }
}

function Box({ prize }: { prize: BoxPrizeKey }) {
  const { face, body } = getPrizeMaterials().boxes[prize];
  const [w, h, d] = BOX_SIZE;
  return (
    <group>
      <RoundedBox
        args={BOX_SIZE}
        radius={0.006}
        smoothness={3}
        material={body}
        castShadow
        receiveShadow
      />
      {[1, -1].map((s) => (
        <mesh
          key={s}
          material={face}
          position={[0, 0, s * (d / 2 + 0.0004)]}
          rotation={[0, s > 0 ? 0 : Math.PI, 0]}
        >
          <planeGeometry args={[w - 0.012, h - 0.012]} />
        </mesh>
      ))}
    </group>
  );
}

function Coin({ label }: { label: CoinLabel }) {
  const m = getMaterials();
  const face = getPrizeMaterials().coins[label];
  coinGeo ??= coinGeometry();
  const y = COIN.h / 2 - COIN.h * 0.22 + 0.0002;
  return (
    <group>
      <mesh geometry={coinGeo} material={m.gold} castShadow receiveShadow />
      {[1, -1].map((s) => (
        <mesh
          key={s}
          material={face}
          position={[0, s * y, 0]}
          rotation={[(-s * Math.PI) / 2, 0, 0]}
        >
          <circleGeometry args={[COIN.r * 0.86, 48]} />
        </mesh>
      ))}
    </group>
  );
}

/** Gachapon capsule, drawn exactly like the ones in the pile (same toy, same colours). */
function Capsule({ id, color }: { id: string; color: string }) {
  const items = useMemo(() => [{ id, color, matrix: new Matrix4() }], [id, color]);
  return <Capsules items={items} />;
}

function Gem({ color }: { color: string }) {
  return <mesh geometry={capsuleKit().geometry.gem} material={gemMaterial(color)} castShadow />;
}

export type PrizeInfo = {
  name: string;
  tier: string;
  value: number;
  height: number;
  /** how the claw holds it: finger tip radius and prize center below the claw's attach point */
  grip: { radius: number; centerY: number };
};

/** Display name, tier, value and grip. Value drives the odds (rarer = weaker grip). */
export function describePrize(p: PlacedPrize): PrizeInfo {
  switch (p.kind) {
    case "box": {
      const b = BOX_PRIZES[p.prize];
      return {
        name: `${b.label} collector box`,
        tier: b.tier,
        value: b.value,
        height: BOX_SIZE[1],
        grip: { radius: 0.06, centerY: -0.245 },
      };
    }
    case "capsule":
      return {
        name: "Mystery capsule",
        tier: "Common",
        value: 2,
        height: CAPSULE_R * 2,
        grip: { radius: 0.034, centerY: -0.25 },
      };
    case "coin":
      return {
        name: `${p.label} token`,
        tier: "Common",
        value: 1.5,
        height: COIN.h * 2,
        grip: { radius: 0.024, centerY: -0.282 },
      };
    case "gem":
      return {
        name: "Cut gem",
        tier: "Uncommon",
        value: 4,
        height: GEM_R * 1.4,
        grip: { radius: 0.03, centerY: -0.255 },
      };
  }
}
