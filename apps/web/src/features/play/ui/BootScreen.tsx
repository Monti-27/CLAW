"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type LoadStep, useQualityStore } from "@/stores/quality.store";
import { PoweredBy } from "./brand/Brand";
import { ClawMark, MARK_INLINE } from "./brand/Logo";
import { type InkApi, InkShader } from "./InkShader";
import { LiquidButton } from "./LiquidButton";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Where the bar jumps to when a step starts, and how far it may creep while the step runs. */
const STEPS: Record<LoadStep, { at: number; creep: number }> = {
  engine: { at: 6, creep: 46 },
  building: { at: 50, creep: 78 },
  compiling: { at: 80, creep: 96 },
  ready: { at: 100, creep: 100 },
};

/** The portal, in seconds from the moment the capsule is full. */
const PORTAL = { flood: 0.85, holeAt: 0.7, hole: 1.25 };

const LETTERS = ["c", "l", "a", "w"];

type Stage = "idle" | "pouring" | "portal" | "done";

/**
 * The way in. Ink drifts behind fluted glass while the game loads. The
 * capsule fills with liquid as you press it, finishing only once the arcade
 * is ready, so nothing stutters later. Then the liquid floods out of the
 * capsule across the whole screen, a glowing hole tears open in it, and you
 * fall through into the arena as it zooms up to meet you. All of it is drawn
 * by the shader worker, so it stays smooth whatever the page is doing.
 */
export function BootScreen({ unsupported = false }: { unsupported?: boolean }) {
  const step = useQualityStore((s) => s.step);
  const ready = step === "ready";
  const ink = useRef<InkApi | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [hover, setHover] = useState(false);
  const [pour, setPour] = useState({ level: 0, ms: 600, ease: undefined as string | undefined });

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 200);
    return () => clearTimeout(t);
  }, []);

  // loading hairline: a CSS transition on the compositor, so it glides even while the scene builds
  const [bar, setBar] = useState({ to: 0, seconds: 0.8 });
  useEffect(() => {
    const { at, creep } = STEPS[step];
    setBar((b) => ({ to: Math.max(b.to, at), seconds: 0.8 }));
    if (step === "ready") return;
    const t = setTimeout(() => setBar({ to: creep, seconds: 10 }), 850);
    return () => clearTimeout(t);
  }, [step]);

  // a sip of liquid on hover, inviting the press
  useEffect(() => {
    if (stage !== "idle") return;
    setPour({ level: hover ? 0.08 : 0, ms: 600, ease: "cubic-bezier(0.16, 1, 0.3, 1)" });
  }, [hover, stage]);

  const press = useCallback(() => {
    if (stage !== "idle") return;
    setStage("pouring");
    // start drawing the arena behind the boot screen now, so its first frames are long done by the reveal
    useQualityStore.getState().startEntering();
    setPour(
      useQualityStore.getState().step === "ready"
        ? { level: 1, ms: 1300, ease: "cubic-bezier(0.65, 0, 0.35, 1)" }
        : { level: 0.88, ms: 3400, ease: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
    );
  }, [stage]);

  // still loading when pressed: the last of the pour waits for the arcade
  useEffect(() => {
    if (stage === "pouring" && ready && pour.level < 1) {
      setPour({ level: 1, ms: 600, ease: "cubic-bezier(0.4, 0, 0.2, 1)" });
    }
  }, [stage, ready, pour.level]);

  // full: the liquid bursts out of the capsule
  useEffect(() => {
    if (stage !== "pouring" || pour.level < 1) return;
    const t = setTimeout(() => {
      const r = button.current?.getBoundingClientRect();
      ink.current?.portal({
        x: r ? r.left + r.width / 2 : window.innerWidth / 2,
        y: r ? r.top + r.height / 2 : window.innerHeight / 2,
        ...PORTAL,
      });
      setStage("portal");
    }, pour.ms + 120);
    return () => clearTimeout(t);
  }, [stage, pour]);

  // as the hole opens the game takes over underneath; the overlay leaves once it's fully open
  useEffect(() => {
    if (stage !== "portal") return;
    const enter = setTimeout(() => useQualityStore.getState().enter(), (PORTAL.holeAt + 0.1) * 1000);
    const done = setTimeout(() => setStage("done"), (PORTAL.holeAt + PORTAL.hole + 0.1) * 1000);
    return () => {
      clearTimeout(enter);
      clearTimeout(done);
    };
  }, [stage]);

  // Enter or Space presses the capsule; on keyup so the key can't hit the Play button that follows
  useEffect(() => {
    if (!ready || stage !== "idle") return;
    const go = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      press();
    };
    window.addEventListener("keyup", go);
    return () => window.removeEventListener("keyup", go);
  }, [ready, stage, press]);

  if (stage === "done" && !unsupported) return null;
  const leaving = stage === "portal";

  return (
    <div
      className={`absolute inset-0 z-30 overflow-hidden ${leaving ? "pointer-events-none" : "bg-[#f4ecef]"}`}
      aria-hidden={leaving}
    >
      <InkShader api={ink} />

      {/* the face is swallowed by the flood: it lifts toward you and dissolves */}
      <motion.div
        className="relative flex h-full flex-col items-center justify-center px-6 text-white"
        animate={leaving ? { opacity: 0, scale: 1.08, filter: "blur(8px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={leaving ? { duration: 0.55, ease: [0.4, 0, 1, 1] } : { duration: 0.3 }}
      >
        <h1 className="flex items-baseline font-display text-[clamp(3.75rem,9vw,6.5rem)] leading-none font-semibold tracking-[-0.065em] [filter:drop-shadow(0_2px_24px_rgba(12,7,15,0.25))]">
          <ClawMark animated breathing state={shown ? "open" : "hidden"} className={MARK_INLINE} />
          {LETTERS.map((ch, i) => (
            <motion.span
              key={ch}
              initial={{ opacity: 0, y: "0.3em", filter: "blur(12px)" }}
              animate={shown ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 1.1, delay: 0.45 + i * 0.07, ease: EASE }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <div className="mt-12 grid h-12 place-items-center">
          {unsupported ? (
            <p className="max-w-[22rem] text-center text-sm leading-relaxed text-white/80">
              This browser can&apos;t run WebGL 2. Turn on hardware acceleration, or open claw in a recent
              Chrome, Edge, Safari or Firefox.
            </p>
          ) : ready || stage !== "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <LiquidButton
                ref={button}
                level={pour.level}
                ms={pour.ms}
                ease={pour.ease}
                pouring={stage !== "idle"}
                full={pour.level >= 1 && stage !== "idle"}
                onClick={press}
                onHover={setHover}
                disabled={stage !== "idle"}
              >
                Enter the arcade
              </LiquidButton>
            </motion.div>
          ) : (
            <motion.div
              className="w-36"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              role="progressbar"
              aria-label="Loading"
            >
              <div className="relative h-px overflow-hidden rounded-full bg-white/30">
                <div
                  className="absolute inset-0 origin-left bg-white"
                  style={{
                    transform: `scaleX(${bar.to / 100})`,
                    transition: `transform ${bar.seconds}s cubic-bezier(${bar.seconds > 2 ? "0.1, 0.6, 0.2, 1" : "0.16, 1, 0.3, 1"})`,
                  }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-0 flex justify-center pb-[max(2rem,env(safe-area-inset-bottom))] text-white mix-blend-difference"
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ delay: leaving ? 0 : 1.2, duration: leaving ? 0.3 : 0.6 }}
      >
        <PoweredBy className="!text-white/70 [&_span:last-child]:!text-white" />
      </motion.div>
    </div>
  );
}
