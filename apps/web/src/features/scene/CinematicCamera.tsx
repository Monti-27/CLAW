"use client";

import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { useClawStore } from "@/stores/claw.store";
import { useQualityStore } from "@/stores/quality.store";
import { type GamePhase, useGameStore } from "@/stores/game.store";
import {
  FOV,
  type Framing,
  establishShot,
  followShot,
  INSPECT,
  type Shot,
  staticShot,
} from "./shots";

/** How long each move takes to settle (camera-controls smoothTime, seconds). */
const SMOOTH: Record<GamePhase, number> = {
  attract: 0.9,
  intro: 0.95,
  playing: 0.5,
  grabbing: 0.55,
  lost: 0.7,
  celebrate: 1.1,
  prize: 0.8,
};


const look = (c: CameraControls, s: Shot, smooth: boolean) =>
  c.setLookAt(...s.position, ...s.target, smooth);

/**
 * The film crew. Every phase change is a damped camera move: fly down to the
 * player's station, pull back to watch the grab, sweep the cabinet on a win,
 * dive to the prize door. Free orbit only on the attract screen.
 */
export function CinematicCamera() {
  const ref = useRef<CameraControls>(null);
  const phase = useGameStore((s) => s.phase);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const framing: Framing = useThree((s) =>
    s.size.width / s.size.height < 0.8 ? "portrait" : "wide",
  );
  const placed = useRef(false);
  /** true while the camera holds the establishing shot behind the boot screen */
  const waiting = useRef(false);
  /** extra field of view (degrees) that eases away as you walk in: the lens settles while the camera pushes */
  const kick = useRef(0);
  const entered = useQualityStore((s) => s.entered);

  useLayoutEffect(() => {
    camera.fov = FOV[framing] + kick.current;
    camera.updateProjectionMatrix();
  }, [camera, framing]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.smoothTime = SMOOTH[phase];
    // free orbit on the title screen only
    c.enabled = phase === "attract" && entered;
    // Free orbit on the title screen stays a turn around the machine at eye height: no diving
    // under the floor or over the wall. Scripted shots elsewhere need the full range.
    const free = phase === "attract";
    c.minPolarAngle = free ? Math.PI * 0.36 : Math.PI * 0.05;
    c.maxPolarAngle = free ? Math.PI * 0.475 : Math.PI * 0.62;
    // close-ups (deck, prize door) need to get nearer than free orbit allows
    c.minDistance = free ? 6.0 : 0.2;
    // a gentle, weighty turn when dragging round the machine
    c.azimuthRotateSpeed = 0.55;
    c.polarRotateSpeed = 0.4;
    if (phase === "grabbing" || phase === "lost") return;

    const inspect =
      phase === "attract"
        ? INSPECT[new URLSearchParams(window.location.search).get("shot") ?? ""]
        : undefined;
    if (inspect) c.minDistance = 0.2;
    // behind the boot screen the camera waits far out; walking in flies it to the title shot
    if (phase === "attract" && !entered && !inspect) {
      c.maxDistance = 30;
      look(c, establishShot(framing), false);
      placed.current = true;
      waiting.current = true;
      kick.current = 16;
      return;
    }
    const arriving = waiting.current;
    waiting.current = false;
    if (!arriving) c.maxDistance = free ? 7.6 : 9;
    if (arriving) c.smoothTime = 1.7;
    const move = look(c, inspect ?? staticShot(phase, framing), placed.current);
    placed.current = true;
    if (arriving) {
      move.then(() => {
        c.maxDistance = 7.6;
        c.smoothTime = SMOOTH.attract;
      });
    }

    if (phase === "intro") {
      // hand control to the player once the fly-in lands (with a safety net)
      const fallback = setTimeout(() => useGameStore.getState().beginPlaying(), 2600);
      move.then(() => {
        clearTimeout(fallback);
        useGameStore.getState().beginPlaying();
      });
      return () => clearTimeout(fallback);
    }
  }, [phase, framing, entered]);

  useFrame((_, delta) => {
    const c = ref.current;
    if (!c) return;

    // settle the lens back to its normal field of view once we're walking in
    if (!waiting.current && kick.current > 0.01) {
      kick.current *= Math.exp(-Math.min(delta, 0.1) * 1.6);
      if (kick.current < 0.01) kick.current = 0;
      camera.fov = FOV[framing] + kick.current;
      camera.updateProjectionMatrix();
    } else if (waiting.current && camera.fov !== FOV[framing] + kick.current) {
      camera.fov = FOV[framing] + kick.current;
      camera.updateProjectionMatrix();
    }

    // win: a slow arc from the right side across the front
    if (phase === "celebrate") c.rotate(-delta * 0.12, 0, true);
    if (phase === "grabbing" || phase === "lost") {
      const p1 = useClawStore.getState().claws.p1;
      look(c, followShot(p1, framing), true);
    }
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      // drag (one finger, or a three-finger trackpad drag) turns round the machine; the wheel,
      // pinch and two-finger scroll do nothing, so the page can't be scrolled into odd angles
      mouseButtons={{
        left: CameraControlsImpl.ACTION.ROTATE,
        middle: CameraControlsImpl.ACTION.NONE,
        right: CameraControlsImpl.ACTION.NONE,
        wheel: CameraControlsImpl.ACTION.NONE,
      }}
      touches={{
        one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
        two: CameraControlsImpl.ACTION.NONE,
        three: CameraControlsImpl.ACTION.NONE,
      }}
      draggingSmoothTime={0.25}
    />
  );
}
