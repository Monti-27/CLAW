"use client";

import { useEffect } from "react";
import { type ButtonId, useControlsStore } from "@/stores/controls.store";

const KEYS: Record<string, ButtonId> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "grab",
  Enter: "grab",
};

/** Arrows / WASD press the deck's arrow buttons, Space or Enter hits GRAB. */
export function useKeyboardControls() {
  useEffect(() => {
    const { press, release, releaseAll } = useControlsStore.getState();
    const down = (e: KeyboardEvent) => {
      const id = KEYS[e.code];
      if (!id || e.repeat) return;
      e.preventDefault();
      press(id);
    };
    const up = (e: KeyboardEvent) => {
      const id = KEYS[e.code];
      if (id) release(id);
    };
    const blur = () => releaseAll();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
}
