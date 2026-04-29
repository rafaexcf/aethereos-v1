import { create } from "zustand";

export interface AppWindow {
  id: string;
  appId: string;
  title: string;
  isMinimized: boolean;
  zIndex: number;
}

interface WindowsState {
  windows: AppWindow[];
  nextZ: number;
}

interface WindowsActions {
  openApp: (appId: string, title: string) => void;
  closeApp: (appId: string) => void;
  focusApp: (appId: string) => void;
  toggleApp: (appId: string, title: string) => void;
  isOpen: (appId: string) => boolean;
}

type WindowsStore = WindowsState & WindowsActions;

export const useWindowsStore = create<WindowsStore>((set, get) => ({
  windows: [],
  nextZ: 200,

  openApp: (appId, title) => {
    const existing = get().windows.find((w) => w.appId === appId);
    if (existing !== undefined) {
      get().focusApp(appId);
      return;
    }
    const z = get().nextZ;
    set((s) => ({
      nextZ: s.nextZ + 1,
      windows: [
        ...s.windows,
        {
          id: `${appId}-${Date.now()}`,
          appId,
          title,
          isMinimized: false,
          zIndex: z,
        },
      ],
    }));
  },

  closeApp: (appId) => {
    set((s) => ({ windows: s.windows.filter((w) => w.appId !== appId) }));
  },

  focusApp: (appId) => {
    const z = get().nextZ;
    set((s) => ({
      nextZ: s.nextZ + 1,
      windows: s.windows.map((w) =>
        w.appId === appId ? { ...w, zIndex: z, isMinimized: false } : w,
      ),
    }));
  },

  toggleApp: (appId, title) => {
    if (get().isOpen(appId)) {
      get().closeApp(appId);
    } else {
      get().openApp(appId, title);
    }
  },

  isOpen: (appId) => get().windows.some((w) => w.appId === appId),
}));
