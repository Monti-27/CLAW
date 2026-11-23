import { Color } from "three";
import type { GamePhase } from "@/stores/game.store";

/**
 * One shared light mood for the whole hall. MoodDriver eases it toward the
 * current phase every frame; every hall shader holds a reference to these
 * same objects as uniforms, so reacting to the game costs nothing extra.
 */
export const mood = {
  tint: new Color(1.0, 0.36, 0.62),
  /** 0 calm, 1 lively, above 1 party */
  energy: { value: 0.35 },
  /** sweep speed multiplier for beams and chasers */
  pace: { value: 1 },
  time: { value: 0 },
};

type Target = { tint: [number, number, number]; energy: number; pace: number };

export const MOODS: Record<GamePhase, Target> = {
  attract: { tint: [1.0, 0.36, 0.62], energy: 0.4, pace: 1 },
  intro: { tint: [1.0, 0.42, 0.66], energy: 0.25, pace: 0.8 },
  playing: { tint: [0.95, 0.4, 0.68], energy: 0.2, pace: 0.7 },
  grabbing: { tint: [1.0, 0.22, 0.55], energy: 0.75, pace: 2.2 },
  lost: { tint: [0.6, 0.16, 0.34], energy: 0.08, pace: 0.5 },
  celebrate: { tint: [1.0, 0.72, 0.36], energy: 1.5, pace: 3 },
  prize: { tint: [1.0, 0.66, 0.42], energy: 0.6, pace: 1.2 },
};
