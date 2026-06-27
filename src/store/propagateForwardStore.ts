import { create } from "zustand";

const STORAGE_KEY = "grind-karo-propagate-forward";

function readEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

interface PropagateForwardState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const usePropagateForwardStore = create<PropagateForwardState>()(
  (set) => ({
    enabled: readEnabled(),
    setEnabled: (enabled) => {
      localStorage.setItem(STORAGE_KEY, String(enabled));
      set({ enabled });
    },
  }),
);
