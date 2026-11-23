"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { PLAYFIELD } from "@/features/cabinet/config/dimensions";
import * as chain from "@/features/chain/session";
import { type ClawId, type ClawState, IDLE_OPEN, LANES, useClawStore } from "@/stores/claw.store";
import { useControlsStore } from "@/stores/controls.store";
import { useGameStore } from "@/stores/game.store";
import { dropDepth, gripOpen, pickTarget, rollGrip, type Target } from "./odds";
import { CELEBRATE_HOLD, DURATION, LOST_HOLD, NEXT } from "./timing";

const SPEED = 0.4; // m/s across the playfield
const STILL = { dx: 0, dz: 0 };

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Runs the round every frame: timer, grab sequencing, outcome, phase hand-offs.
 * With a round live onchain (features/chain) the grab goes to the Ephemeral
 * Rollup and the claw stays closed until MagicBlock VRF sends the roll back;
 * with no wallet the same loop runs as a local demo.
 */
export function ClawDirector() {
  const target = useRef<Target | null>(null);
  const hold = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 10);
    const game = useGameStore.getState();
    const claws = useClawStore.getState();

    game.tick(dt);
    // timer ran out: the claw drops on its own (a crank does this onchain)
    if (game.phase === "playing" && game.timeLeft <= 0) game.beginGrab();

    if (game.phase === "grabbing" && claws.claws.p1.phase === "idle" && !game.roll) {
      const pile = game.pile.filter((p) => !game.taken.includes(p.id));
      const { x, z } = claws.claws.p1;
      // onchain: sends move_claw + grab, and tells us which target the program accepts
      target.current = chain.grab(x, z, pickTarget(x, z, pile));
      game.setAim(target.current?.prize ?? null);
      useControlsStore.getState().releaseAll();
      claws.grab("p1", dropDepth(target.current, x, z), gripOpen(target.current));
    }

    const input = game.phase === "playing" ? claws.input : STILL;
    const moved = step("p1", claws.claws.p1, dt, input, chain.waitingForRoll());
    if (moved === "dropping->closing") game.grip();
    if (moved === "closing->rising") {
      const onchain = chain.isLive();
      // the VRF roll if a round is live; a local roll in the demo, or if the rollup went quiet
      game.setRoll(chain.takeRoll() ?? { ...rollGrip(target.current), offline: onchain });
    }
    if (moved === "releasing->idle") game.settle();

    step("p2", claws.claws.p2, dt, ghostInput(state.clock.elapsedTime));

    // timed hand-offs between result screens
    if (game.phase === "lost" || game.phase === "celebrate") {
      hold.current += dt;
      if (game.phase === "lost" && hold.current > LOST_HOLD) game.playAgain();
      if (game.phase === "celebrate" && hold.current > CELEBRATE_HOLD) game.showPrize();
    } else {
      hold.current = 0;
    }
  });

  return null;
}

/** P2 drifts on its own so the machine always looks alive for spectators. */
function ghostInput(t: number) {
  return { dx: Math.sin(t * 0.45) * 0.55, dz: Math.cos(t * 0.31) * 0.55 };
}

/**
 * Advances one claw. Returns "from->to" when a phase ends. `holdClosed` keeps
 * it gripping at the bottom while an onchain roll is still on its way.
 */
function step(
  id: ClawId,
  c: ClawState,
  dt: number,
  input: { dx: number; dz: number },
  holdClosed = false,
): string | null {
  const { patch } = useClawStore.getState();
  const lane = LANES[id];

  if (c.phase === "idle") {
    if (!input.dx && !input.dz) return null;
    patch(id, {
      x: clamp(c.x + input.dx * SPEED * dt, lane.minX, lane.maxX),
      z: clamp(c.z + input.dz * SPEED * dt, PLAYFIELD.minZ + 0.06, PLAYFIELD.maxZ - 0.05),
    });
    return null;
  }

  const phase = c.phase;
  const t = c.t + dt;
  const k = ease(Math.min(1, t / DURATION[phase]));
  const next: Partial<ClawState> = { t };

  switch (phase) {
    case "dropping":
      next.drop = k * c.depth;
      next.open = IDLE_OPEN + (1 - IDLE_OPEN) * k;
      break;
    case "closing":
      next.open = 1 - k * (1 - c.grip);
      break;
    case "rising":
      next.drop = c.depth * (1 - k);
      break;
    case "returning":
      next.x = c.x + (lane.homeX - c.x) * Math.min(1, dt * 3.2);
      next.z = c.z + (lane.homeZ - c.z) * Math.min(1, dt * 3.2);
      break;
    case "releasing":
      next.open = c.grip + (IDLE_OPEN - c.grip) * Math.min(1, k * 2.5);
      break;
  }

  let moved: string | null = null;
  if (t >= DURATION[phase] && phase === "closing" && holdClosed) {
    next.t = DURATION[phase];
  } else if (t >= DURATION[phase]) {
    next.phase = NEXT[phase];
    next.t = 0;
    moved = `${phase}->${next.phase}`;
  }
  patch(id, next);
  return moved;
}
