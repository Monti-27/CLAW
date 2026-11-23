"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { type Group, type InstancedMesh, Object3D } from "three";
import { useGameStore } from "@/stores/game.store";
import { isInspecting } from "./shots";

/** Radius of the rotating disc the cabinet stands on. */
export const TURNTABLE_RADIUS = 1.3;
const SPEED = 0.16; // rad/s, one turn in about 40 seconds
const TAU = Math.PI * 2;
const TICKS = 48;

/**
 * The show turntable. On the title screen it carries the cabinet round so
 * you see every side; when a round starts it glides to face the player and
 * holds there. The contact shadow lives on the disc and turns with it, so it
 * is rendered once instead of every frame.
 */
export function Turntable({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const ticks = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = ticks.current;
    if (!m) return;
    const o = new Object3D();
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * TAU;
      const long = i % 4 === 0;
      o.position.set(Math.sin(a) * -(TURNTABLE_RADIUS - 0.07), 0.002, Math.cos(a) * -(TURNTABLE_RADIUS - 0.07));
      o.rotation.set(-Math.PI / 2, 0, a);
      o.scale.set(long ? 0.012 : 0.006, long ? 0.07 : 0.04, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1);
    if (useGameStore.getState().phase === "attract" && !isInspecting()) {
      g.rotation.y += SPEED * dt;
      return;
    }
    // ease to the nearest full turn so the front faces the player
    const home = Math.round(g.rotation.y / TAU) * TAU;
    const gap = home - g.rotation.y;
    g.rotation.y = Math.abs(gap) < 0.0005 ? home : g.rotation.y + gap * (1 - Math.exp(-dt * 6));
  });

  return (
    <group ref={ref}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[TURNTABLE_RADIUS, 72]} />
        <meshStandardMaterial color="#1c1920" metalness={0.35} roughness={0.36} envMapIntensity={0.9} />
      </mesh>
      <instancedMesh ref={ticks} args={[undefined, undefined, TICKS]}>
        <planeGeometry />
        <meshBasicMaterial color="#8d8494" />
      </instancedMesh>
      <ContactShadows
        position={[0, 0.004, 0]}
        opacity={0.6}
        scale={2.7}
        blur={2.2}
        far={1.6}
        resolution={256}
        frames={1}
      />
      {children}
    </group>
  );
}
