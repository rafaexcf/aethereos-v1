import { create } from "zustand";

interface AppWindow {
  id: string;
  appId: string;
  zIndex: number;
}

interface WindowsState {
  windows: AppWindow[];
  nextZ: number;
}

interface WindowsActions {
  openWindow: (appId: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
}

export type WindowsStore = WindowsState & WindowsActions;

export const useWindowsStore = create<WindowsStore>((set, get) => ({
  windows: [],
  nextZ: 100,

  openWindow: (appId) => {
    const existing = get().windows.find((w) => w.appId === appId);
    if (existing) {
      get().focusWindow(existing.id);
      return;
    }
    const id = `${appId}-${Date.now()}`;
    const zIndex = get().nextZ;
    set((s) => ({
      windows: [...s.windows, { id, appId, zIndex }],
      nextZ: s.nextZ + 1,
    }));
  },

  closeWindow: (id) => {
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }));
  },

  focusWindow: (id) => {
    const zIndex = get().nextZ;
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex } : w)),
      nextZ: s.nextZ + 1,
    }));
  },
}));
