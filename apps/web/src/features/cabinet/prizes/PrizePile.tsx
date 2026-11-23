"use client";

import { useMemo } from "react";
import { CircleGeometry, Vector3 } from "three";
import { useGameStore } from "@/stores/game.store";
import { PLAYFIELD } from "../config/dimensions";
import { getMaterials } from "../materials";
import { Batch, type CapsuleSpec, Capsules, compose, type Slot } from "./Batch";
import { COIN_LABELS, GEM_COLORS } from "./catalog";
import { COIN, RISER, type PlacedPrize } from "./layout";
import { getCoinGeometry, getPrizeMaterials, PrizeMesh } from "./PrizeMesh";
import { capsuleKit, gemMaterial } from "./shapes";

let coinFace: CircleGeometry | null = null;
const faceY = COIN.h / 2 - COIN.h * 0.22 + 0.0002;
const LOCAL = {
  coinTop: compose([0, faceY, 0], [-Math.PI / 2, 0, 0]),
  coinBottom: compose([0, -faceY, 0], [Math.PI / 2, 0, 0]),
  gem: compose([0, 0, 0], [0, 0, 0], new Vector3(1, 1, 1)),
};

/** Everything still in the machine. Won prizes drop out of the pile. */
export function PrizePile() {
  const pile = useGameStore((s) => s.pile);
  const taken = useGameStore((s) => s.taken);
  const heldId = useGameStore((s) => (s.gripped ? s.aim?.id : undefined));

  const m = getMaterials();
  const riserZ = PLAYFIELD.minZ - 0.07 + RISER.depth / 2;

  const groups = useMemo(() => {
    const live = pile.filter((p) => p.id !== heldId && !taken.includes(p.id));
    const capsules: CapsuleSpec[] = [];
    const coinBody: Slot[] = [];
    const coinFaces: Record<string, Slot[]> = Object.fromEntries(COIN_LABELS.map((l) => [l, []]));
    const gems: Record<string, Slot[]> = Object.fromEntries(GEM_COLORS.map((c) => [c, []]));
    const boxes: PlacedPrize[] = [];

    for (const p of live) {
      const at = compose(p.position, p.rotation);
      switch (p.kind) {
        case "capsule":
          capsules.push({ id: p.id, color: p.color, matrix: at });
          break;
        case "coin":
          coinBody.push({ matrix: at });
          coinFaces[p.label]?.push(
            { matrix: at.clone().multiply(LOCAL.coinTop) },
            { matrix: at.clone().multiply(LOCAL.coinBottom) },
          );
          break;
        case "gem":
          gems[p.color]?.push({ matrix: at.clone().multiply(LOCAL.gem) });
          break;
        case "box":
          boxes.push(p);
          break;
      }
    }
    return { capsules, coinBody, coinFaces, gems, boxes };
  }, [pile, taken, heldId]);

  const prizeMats = getPrizeMaterials();
  const kit = capsuleKit();
  const face = (coinFace ??= new CircleGeometry(COIN.r * 0.86, 36));

  return (
    <group>
      {/* display riser the boxes stand on */}
      <mesh
        material={m.blushLight}
        position={[0, PLAYFIELD.floor + RISER.height / 2, riserZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[PLAYFIELD.maxX - PLAYFIELD.minX + 0.12, RISER.height, RISER.depth]} />
      </mesh>

      <Capsules items={groups.capsules} />

      <Batch slots={groups.coinBody} geometry={getCoinGeometry()} material={m.gold} />
      {COIN_LABELS.map((l) => (
        <Batch
          key={l}
          slots={groups.coinFaces[l] ?? []}
          geometry={face}
          material={prizeMats.coins[l]}
          shadow={false}
        />
      ))}
      {GEM_COLORS.map((c) => (
        <Batch
          key={c}
          slots={groups.gems[c] ?? []}
          geometry={kit.geometry.gem}
          material={gemMaterial(c)}
        />
      ))}

      {groups.boxes.map((p) => (
        <group key={p.id} position={p.position} rotation={p.rotation}>
          <PrizeMesh prize={p} />
        </group>
      ))}
    </group>
  );
}
