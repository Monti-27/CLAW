import { create } from "zustand";

const KEY = "claw:muted";

const readMuted = () => {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

type SettingsStore = { muted: boolean; toggleMuted: () => void };

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  muted: readMuted(),
  toggleMuted: () => {
    const muted = !get().muted;
    try {
      window.localStorage.setItem(KEY, muted ? "1" : "0");
    } catch {
      // private mode: the choice just lasts for this visit
    }
    set({ muted });
  },
}));
