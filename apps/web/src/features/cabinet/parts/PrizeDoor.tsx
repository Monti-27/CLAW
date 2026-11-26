"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, MeshBasicMaterial } from "three";
import { useGameStore } from "@/stores/game.store";
import { PRIZE_DOOR } from "../config/dimensions";
import { getMaterials } from "../materials";
import { COIN } from "../prizes/layout";
import { describePrize, PrizeMesh } from "../prizes/PrizeMesh";
import { drawPrizeOut } from "../textures/art";
import { useArtTexture } from "../textures/useArtTexture";
import { useBezelGeometry, usePlateGeometry } from "./Trim";

const { width: W, height: H, depth: D } = PRIZE_DOOR;
const BAR = 0.022;
const SIGN = { w: 0.2, h: 0.038 };
/** Seconds into the reveal when each beat starts. */
const BEAT = { fall: 0.15, flap: 0.75, glide: 1.25, glideEnd: 2.2 };
const smooth = (k: number) => k * k * (3 - 2 * k);
const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/**
 * Prize bin. A real recess with a tray, a strip light and a smoked acrylic
 * flap. On a win the prize drops into the tray, the light comes up, the flap
 * swings out and the prize glides forward to meet the camera.
 */
export function PrizeDoor() {
  const m = getMaterials();
  const legend = useArtTexture(1280, 240, drawPrizeOut);
  const bezel = useBezelGeometry(W, H, BAR, 0.018, 0.016);
  const halo = useBezelGeometry(W + BAR * 2 - 0.004, H + BAR * 2 - 0.004, 0.007, 0.002, 0.016 + BAR);
  const signPlate = usePlateGeometry(SIGN.w, SIGN.h, 0.006, 0.008);
  const haloMat = useRef<MeshBasicMaterial>(null);
  const signMat = useRef<MeshBasicMaterial>(null);
  const won = useGameStore((s) => s.won);
  const flap = useRef<Group>(null);
  const prize = useRef<Group>(null);
  const turn = useRef<Group>(null);
  const strip = useRef<MeshBasicMaterial>(null);
  const clock = useRef(0);
  const open = useRef(0);
  const lamp = useRef(0);
  const halo_ = useRef(0);

  const info = won ? describePrize(won) : null;
  // a coin stands on its edge in the tray, so its height there is its diameter
  const tall = won?.kind === "coin" ? COIN.r * 2 : (info?.height ?? 0.1);
  const rest = -H / 2 + 0.012 + Math.min(tall, H - 0.04) / 2;
  const fit = Math.min(1.5, 0.15 / tall);

  useFrame((_, delta) => {
    const revealing = useGameStore.getState().phase === "prize";
    const dt = Math.min(delta, 0.1);
    clock.current = revealing ? clock.current + dt : 0;
    const t = clock.current;

    lamp.current += ((revealing ? 1 : 0) - lamp.current) * Math.min(1, dt * 5);
    if (strip.current) strip.current.color.setScalar(0.06 + lamp.current * 4);
    // halo and sign breathe at idle, and come right up for the reveal
    const phase = useGameStore.getState().phase;
    const party = phase === "celebrate" ? 1 : 0;
    halo_.current += (party + lamp.current - halo_.current) * Math.min(1, dt * 4);
    const pulse = 0.5 + 0.5 * Math.sin(_.clock.elapsedTime * 2.4);
    haloMat.current?.color.setRGB(1, 0.35, 0.63).multiplyScalar(0.55 + pulse * 0.25 + halo_.current * 2.2);
    signMat.current?.color.setScalar(1 + halo_.current * 0.8);

    const flapGoal = revealing && t > BEAT.flap ? 1 : 0;
    open.current += (flapGoal - open.current) * Math.min(1, dt * 6);
    if (flap.current) flap.current.rotation.x = -open.current * 1.5;

    const g = prize.current;
    if (!g) return;
    g.visible = revealing;
    if (!revealing) return;

    // drop into the tray with one small bounce
    const tf = Math.max(0, t - BEAT.fall);
    let y = rest + 0.3 - 4.5 * tf * tf;
    if (y < rest) {
      const b = span(tf, 0.26, 0.5);
      y = rest + Math.sin(b * Math.PI) * 0.018 * (1 - b);
    }
    // then glide out to meet the camera
    const k = smooth(span(t, BEAT.glide, BEAT.glideEnd));
    g.position.set(
      0,
      y + (0.01 - rest) * k + Math.sin(t * 1.6) * 0.006 * k,
      -D / 2 + (D / 2 + 0.17) * k,
    );
    g.scale.setScalar(1 + (fit - 1) * k);
    if (turn.current) turn.current.rotation.y = k > 0 ? turn.current.rotation.y + dt * 0.9 * k : 0;
  });

  return (
    <group position={[PRIZE_DOOR.x, PRIZE_DOOR.y, PRIZE_DOOR.z]} userData={{ noMerge: true }}>
      {/* liner: the five inside faces of the recess */}
      <group>
        <mesh material={m.cavity} position={[0, 0, -D + 0.001]}>
          <planeGeometry args={[W, H]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            material={m.cavity}
            position={[s * (W / 2 - 0.001), 0, -D / 2]}
            rotation={[0, (-s * Math.PI) / 2, 0]}
          >
            <planeGeometry args={[D, H]} />
          </mesh>
        ))}
        <mesh
          material={m.cavity}
          position={[0, H / 2 - 0.001, -D / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[W, D]} />
        </mesh>
        {/* rubber tray mat */}
        <mesh material={m.rubber} position={[0, -H / 2 + 0.005, -D / 2]} receiveShadow>
          <boxGeometry args={[W, 0.01, D]} />
        </mesh>
        {/* strip light tucked under the top edge */}
        <mesh position={[0, H / 2 - 0.008, -0.03]}>
          <boxGeometry args={[W - 0.08, 0.006, 0.012]} />
          <meshBasicMaterial ref={strip} color="#ffe9d2" toneMapped={false} />
        </mesh>
      </group>

      {/* LED halo behind the bezel: idles soft pink, flares on a win */}
      <mesh geometry={halo} position={[0, 0, 0.0005]}>
        <meshBasicMaterial ref={haloMat} color="#ff5aa0" toneMapped={false} />
      </mesh>
      {/* chrome bezel with rounded corners */}
      <mesh geometry={bezel} material={m.chrome} castShadow />

      {/* the lit PRIZE sign above the door */}
      <group position={[0, H / 2 + BAR + 0.034, 0.002]}>
        <mesh geometry={signPlate} material={m.blackGloss} />
        <mesh position={[0, 0, 0.0062]}>
          <planeGeometry args={[SIGN.w - 0.01, SIGN.h - 0.008]} />
          <meshBasicMaterial ref={signMat} map={legend} toneMapped={false} />
        </mesh>
      </group>

      {/* smoked flap, hinged along its top edge */}
      <group ref={flap} position={[0, H / 2 - 0.002, -0.004]}>
        <mesh material={m.smoked} position={[0, -H / 2 + 0.004, 0]}>
          <boxGeometry args={[W - 0.008, H - 0.012, 0.004]} />
        </mesh>
        <mesh material={m.chrome} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, W - 0.004, 12]} />
        </mesh>
        <mesh material={m.chrome} position={[0, -H + 0.016, 0.004]}>
          <boxGeometry args={[0.1, 0.008, 0.006]} />
        </mesh>
      </group>

      {won && (
        <group ref={prize} visible={false}>
          {/* coins stand on edge and face the player; everything else stays upright */}
          <group ref={turn}>
            <group rotation={[won.kind === "coin" ? Math.PI / 2 : 0, 0, 0]}>
              <PrizeMesh prize={won} />
            </group>
          </group>
          <Sparkles
            count={18}
            scale={[0.3, 0.24, 0.2]}
            size={1.6}
            speed={0.5}
            color="#ffe7c2"
            opacity={0.7}
          />
        </group>
      )}
    </group>
  );
}
