"use client";

import { useEffect } from "react";
import { useClawStore } from "@/stores/claw.store";
import { type ButtonId, useControlsStore } from "@/stores/controls.store";
import { useGameStore } from "@/stores/game.store";
import { useSettingsStore } from "@/stores/settings.store";
import { gantry, hoist, measureSounds, play, setMuted, unlockAudio } from "./engine";

const BUTTONS: ButtonId[] = ["left", "right", "up", "down", "grab"];

/**
 * Listens to the stores and plays what a person standing at the machine
 * would hear. One sound per real event, nothing on a loop except motors
 * while they are actually turning.
 */
export function SoundDirector() {
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    setMuted(useSettingsStore.getState().muted);
    const stops = [
      useSettingsStore.subscribe((s) => setMuted(s.muted)),

      useControlsStore.subscribe((s, p) => {
        for (const id of BUTTONS) {
          if (s.pressed[id] && !p.pressed[id]) play("press");
          if (!s.pressed[id] && p.pressed[id]) play("release");
        }
      }),

      useGameStore.subscribe((s, p) => {
        if (s.phase !== p.phase) {
          if (s.phase === "intro" && p.phase === "attract") {
            play("coin");
            play("start", 0.32);
          }
          if (s.phase === "lost") play("lose", 0.25);
          if (s.phase === "celebrate") play("win", 0.15);
          if (s.phase === "prize") {
            play("door", 0.75);
            play("ding", 2.1);
          }
          if (s.phase === "attract") {
            gantry(false);
            hoist("off");
          }
        }
        // the prize slipped and just landed back on the pile
        if (p.gripped && !s.gripped && s.roll && !s.roll.won) play("thud");
        // last five seconds
        const now = Math.ceil(s.timeLeft);
        if (s.phase === "playing" && now !== Math.ceil(p.timeLeft) && now <= 5 && now > 0)
          play("tick");
      }),

      useClawStore.subscribe((s, p) => {
        const claw = s.claws.p1;
        const game = useGameStore.getState();
        if (claw.phase !== p.claws.p1.phase) {
          switch (claw.phase) {
            case "dropping":
              hoist("down");
              break;
            case "closing":
              hoist("off");
              play("clamp", 0.18);
              break;
            case "rising":
              hoist("up");
              break;
            case "returning":
              hoist("off");
              break;
            case "releasing":
              play("open");
              if (game.roll?.won) play("chute", 0.3);
              break;
          }
        }
        const steering =
          claw.phase === "idle" &&
          game.phase === "playing" &&
          (s.input.dx !== 0 || s.input.dz !== 0);
        const wasSteering =
          p.claws.p1.phase === "idle" &&
          game.phase === "playing" &&
          (p.input.dx !== 0 || p.input.dz !== 0);
        const carrying = claw.phase === "returning";
        if ((steering || carrying) !== (wasSteering || p.claws.p1.phase === "returning"))
          gantry(steering || carrying);
      }),
    ];

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __clawMeasureSounds?: typeof measureSounds }).__clawMeasureSounds =
        measureSounds;
    }

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      for (const stop of stops) stop();
    };
  }, []);

  return null;
}
