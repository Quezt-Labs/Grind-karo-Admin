import { create } from "zustand";

interface SidebarState {
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isMobileOpen: false,
  setMobileOpen: (open) => set({ isMobileOpen: open }),
}));
