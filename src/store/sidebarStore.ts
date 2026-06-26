import { create } from "zustand";

const RAIL_STORAGE_KEY = "grind-karo-sidebar-rail-collapsed";

function readRailCollapsed(): boolean {
  try {
    return localStorage.getItem(RAIL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

interface SidebarState {
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isMobileOpen: false,
  setMobileOpen: (open) => set({ isMobileOpen: open }),
  isCollapsed: readRailCollapsed(),
  setCollapsed: (collapsed) => {
    localStorage.setItem(RAIL_STORAGE_KEY, String(collapsed));
    set({ isCollapsed: collapsed });
  },
  toggleCollapsed: () =>
    set((state) => {
      const next = !state.isCollapsed;
      localStorage.setItem(RAIL_STORAGE_KEY, String(next));
      return { isCollapsed: next };
    }),
}));
