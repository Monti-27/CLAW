"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { ACESFilmicToneMapping, type Material, type MeshPhysicalMaterial, NoToneMapping } from "three";
import { Cabinet } from "@/features/cabinet";
import { ClawDirector } from "@/features/round/ClawDirector";
import { useClawStore } from "@/stores/claw.store";
import { useGameStore } from "@/stores/game.store";
import { useQualityStore } from "@/stores/quality.store";
import { CinematicCamera } from "./CinematicCamera";
import { Effects } from "./Effects";
import { LightShow } from "./LightShow";
import { Stage } from "./Stage";
import { Turntable } from "./Turntable";
import { World } from "./World";

/**
 * The pixel ratio that keeps the scene crisp on this screen right now: the
 * display's own density times any pinch zoom (the browser magnifies the canvas
 * bitmap when you pinch, so it has to be drawn bigger to stay sharp). Browser
 * zoom already shows up in devicePixelRatio. Capped by the tier and by a
 * pixel budget for the canvas size.
 */
function useSharpDpr(ceiling: number, pixels: number) {
  const measure = () => {
    const pinch = window.visualViewport?.scale ?? 1;
    const want = window.devicePixelRatio * Math.max(1, pinch);
    const area = Math.max(1, window.innerWidth * window.innerHeight);
    return Math.min(ceiling, want, Math.sqrt(pixels / area));
  };
  const [value, setValue] = useState(measure);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      // settle on the zoom the gesture ends at, not every step of it
      raf = requestAnimationFrame(() => setValue(Math.round(measure() * 20) / 20));
    };
    const vv = window.visualViewport;
    window.addEventListener("resize", update);
    vv?.addEventListener("resize", update);
    // browser zoom changes devicePixelRatio without always firing resize
    let mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDpr = () => {
      update();
      mq.removeEventListener("change", onDpr);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onDpr);
    };
    mq.addEventListener("change", onDpr);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      mq.removeEventListener("change", onDpr);
    };
    // measure reads only globals
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  }, [ceiling, pixels]);
  return value;
}

export function ClawScene() {
  const profile = useQualityStore((s) => s.profile);
  // compiled and baked, but only drawn once someone is walking in (no second GPU load behind the boot screen)
  const ready = useQualityStore((s) => s.step === "ready" && s.entering);
  const [min] = profile.dpr;
  const sharp = useSharpDpr(profile.dpr[1], profile.pixels);
  // PerformanceMonitor's say, 0..1; start at full sharpness on capable tiers
  const [factor, setFactor] = useState(() => (useQualityStore.getState().tier === "low" ? 0.8 : 1));
  const dpr = Math.round(Math.max(min, Math.min(sharp, min + (sharp - min) * factor)) * 100) / 100;

  useEffect(() => useQualityStore.getState().setStep("building"), []);

  return (
    <Canvas
      shadows={profile.shadows}
      dpr={dpr}
      // nothing is drawn until every shader is compiled off the main thread
      frameloop={ready ? "always" : "never"}
      camera={{ position: [3.1, 2.0, 5.5], fov: 36, near: 0.05, far: 80 }}
      gl={{
        antialias: !profile.post,
        powerPreference: "high-performance",
        stencil: false,
        preserveDrawingBuffer: false,
      }}
    >
      <PerformanceMonitor
        factor={0.8}
        flipflops={4}
        onChange={({ factor: f }) => setFactor(Math.round(f * 20) / 20)}
        onFallback={() => {
          // still struggling at the bottom of the range: drop post and go to minimum resolution
          useQualityStore.getState().dropPost();
          setFactor(0);
        }}
      />
      <QualityRig />
      <Suspense fallback={null}>
        <World />
        <Stage />
        <Turntable>
          <Cabinet />
        </Turntable>
        <LightShow />
        <ClawDirector />
        <Effects />
        <Warmup />
      </Suspense>
      <CinematicCamera />
    </Canvas>
  );
}

/** Applies tier settings that live on the renderer and on shared materials. */
function QualityRig() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __cam: { camera, controls } });
  }, [camera, controls]);
  const scene = useThree((s) => s.scene);
  const post = useQualityStore((s) => s.post);
  const { clearcoat, shadowEvery, shadows } = useQualityStore((s) => s.profile);

  useEffect(() => {
    // dev only: lets you poke at the scene from the console (window.__claw.scene)
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __claw: unknown }).__claw = { gl, scene, game: useGameStore, claws: useClawStore };
    }
  }, [gl, scene]);

  useEffect(() => {
    // with post off the renderer does the filmic curve itself
    gl.toneMapping = post ? NoToneMapping : ACESFilmicToneMapping;
  }, [gl, post]);

  useEffect(() => {
    if (clearcoat) return;
    // weak GPUs: the clearcoat, sheen and iridescence lobes are dropped (each one is a second specular pass)
    const seen = new Set<Material>();
    scene.traverse((o) => {
      const mat = (o as { material?: Material }).material;
      if (!mat || seen.has(mat) || !(mat as MeshPhysicalMaterial).isMeshPhysicalMaterial) return;
      seen.add(mat);
      const p = mat as MeshPhysicalMaterial;
      p.clearcoat = 0;
      p.sheen = 0;
      p.iridescence = 0;
    });
  }, [scene, clearcoat]);

  useEffect(() => {
    gl.shadowMap.autoUpdate = !shadows || shadowEvery === 1;
  }, [gl, shadows, shadowEvery]);

  const frame = useRef(0);
  useFrame(() => {
    if (!shadows || shadowEvery === 1) return;
    frame.current++;
    if (frame.current % shadowEvery === 0) gl.shadowMap.needsUpdate = true;
  });

  return null;
}

/**
 * Compiles every program with KHR_parallel_shader_compile before the first
 * frame, so the page never freezes while the GPU driver builds shaders.
 */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const advance = useThree((s) => s.advance);

  useEffect(() => {
    const store = useQualityStore.getState();
    store.setStep("compiling");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // one manual frame bakes the environment and the contact shadow before the reveal
      advance(performance.now());
      requestAnimationFrame(() => useQualityStore.getState().setStep("ready"));
    };
    const timeout = setTimeout(finish, 6000);
    gl.compileAsync(scene, camera).then(finish, finish);
    return () => clearTimeout(timeout);
  }, [gl, scene, camera, advance]);

  return null;
}
