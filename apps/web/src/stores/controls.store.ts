import { create } from "zustand";
import { useClawStore } from "./claw.store";
import { useGameStore } from "./game.store";

export type ButtonId = "left" | "right" | "up" | "down" | "grab";

const AXIS: Record<Exclude<ButtonId, "grab">, { dx: number; dz: number }> = {
  left: { dx: -1, dz: 0 },
  right: { dx: 1, dz: 0 },
  up: { dx: 0, dz: -1 },
  down: { dx: 0, dz: 1 },
};

type ControlsStore = {
  pressed: Record<ButtonId, boolean>;
  press: (id: ButtonId) => void;
  release: (id: ButtonId) => void;
  releaseAll: () => void;
};

const NONE: Record<ButtonId, boolean> = {
  left: false,
  right: false,
  up: false,
  down: false,
  grab: false,
};

/**
 * One source of truth for the deck: mouse, touch and keyboard all press the
 * same buttons, so the 3D buttons light up however the player drives.
 */
export const useControlsStore = create<ControlsStore>()((set, get) => {
  const syncInput = (pressed: Record<ButtonId, boolean>) => {
    let dx = 0;
    let dz = 0;
    for (const [id, v] of Object.entries(AXIS)) {
      if (!pressed[id as ButtonId]) continue;
      dx += v.dx;
      dz += v.dz;
    }
    useClawStore.getState().setInput({ dx, dz });
  };

  return {
    pressed: NONE,
    press: (id) => {
      const game = useGameStore.getState();
      if (game.phase !== "playing") return;
      if (get().pressed[id]) return;
      const pressed = { ...get().pressed, [id]: true };
      set({ pressed });
      if (id === "grab") game.beginGrab();
      else syncInput(pressed);
    },
    release: (id) => {
      if (!get().pressed[id]) return;
      const pressed = { ...get().pressed, [id]: false };
      set({ pressed });
      syncInput(pressed);
    },
    releaseAll: () => {
      set({ pressed: NONE });
      syncInput(NONE);
    },
  };
});
