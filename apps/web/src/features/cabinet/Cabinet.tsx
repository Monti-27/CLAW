"use client";

import { useLayoutEffect, useRef } from "react";
import type { Group, Material, Mesh } from "three";
import { BackPanel } from "./parts/BackPanel";
import { LowerBody, Plinth } from "./parts/Base";
import { Bulbs } from "./parts/Bulbs";
import { Chute } from "./parts/Chute";
import { Claw, Gantry } from "./parts/Claw";
import { ControlDeck } from "./parts/ControlDeck";
import { GlassCase, Ledge } from "./parts/GlassCase";
import { Marquee } from "./parts/Marquee";
import { Tower } from "./parts/Tower";
import { PrizePile } from "./prizes/PrizePile";
import { StaticBatch } from "./StaticBatch";

/** Solid, lit surfaces take part in shadows; glass, lamps and decals don't. */
function shadowable(mesh: Mesh) {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material & {
    isMeshBasicMaterial?: boolean;
    emissiveIntensity?: number;
  };
  return !mat.transparent && !mat.isMeshBasicMaterial && (mat.emissiveIntensity ?? 0) < 0.5;
}

/** The whole machine, assembled bottom to top. */
export function Cabinet() {
  const root = useRef<Group>(null);

  useLayoutEffect(() => {
    root.current?.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || !shadowable(mesh)) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, []);

  return (
    <group ref={root}>
      <StaticBatch>
        <Plinth />
        <LowerBody />
        <Tower side={-1} />
        <Tower side={1} />
        <Ledge />
        <BackPanel />
        <GlassCase />
        <Chute side={-1} />
        <Chute side={1} />
        <Marquee />
        <Gantry />
      </StaticBatch>
      <ControlDeck />
      <PrizePile />
      <Claw id="p1" />
      <Claw id="p2" />

      <Bulbs />
    </group>
  );
}
