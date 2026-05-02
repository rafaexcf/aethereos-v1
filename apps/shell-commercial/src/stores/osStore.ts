import { create } from "zustand";
import type { OSTab } from "../types/os";

interface OSState {
  tabs: OSTab[];
  activeTabId: string;
  dockOrder: string[];
  hiddenDockApps: string[];
  aiModalOpen: boolean;
  dockHidden: boolean;
  appsLauncherOpen: boolean;
  supportOpen: boolean;
}

interface OSActions {
  openApp: (appId: string, title: string) => void;
  closeTab: (tabId: string) => void;
  focusTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  setDockOrder: (order: string[]) => void;
  setHiddenDockApps: (hidden: string[]) => void;
  toggleDockApp: (appId: string) => void;
  toggleAIModal: () => void;
  openAIModal: () => void;
  closeAIModal: () => void;
  toggleDockHidden: () => void;
  openAppsLauncher: () => void;
  closeAppsLauncher: () => void;
  openSupport: () => void;
  closeSupport: () => void;
}

const INITIAL_TABS: OSTab[] = [
  {
    id: "mesa-tab",
    appId: "mesa",
    title: "Mesa",
    isActive: true,
    isPinned: true,
  },
];

function loadDockOrder(): string[] {
  try {
    const saved = localStorage.getItem("aethereos-dock-order");
    if (saved) return JSON.parse(saved) as string[];
  } catch {
    // corrupt localStorage — use default
  }
  return [];
}

function loadHiddenDockApps(): string[] {
  try {
    const saved = localStorage.getItem("aethereos-hidden-dock-apps");
    if (saved) return JSON.parse(saved) as string[];
  } catch {
    // corrupt localStorage — use default
  }
  return [];
}

export const useOSStore = create<OSState & OSActions>((set, get) => ({
  tabs: INITIAL_TABS,
  activeTabId: "mesa-tab",
  dockOrder: loadDockOrder(),
  hiddenDockApps: loadHiddenDockApps(),
  aiModalOpen: false,
  dockHidden: false,
  appsLauncherOpen: false,
  supportOpen: false,

  toggleAIModal: () => set((s) => ({ aiModalOpen: !s.aiModalOpen })),
  openAIModal: () => set({ aiModalOpen: true }),
  closeAIModal: () => set({ aiModalOpen: false }),
  toggleDockHidden: () => set((s) => ({ dockHidden: !s.dockHidden })),
  openAppsLauncher: () => set({ appsLauncherOpen: true }),
  closeAppsLauncher: () => set({ appsLauncherOpen: false }),
  openSupport: () => set({ supportOpen: true }),
  closeSupport: () => set({ supportOpen: false }),

  openApp: (appId, title) => {
    const { tabs, activeTabId } = get();
    const existing = tabs.find((t) => t.appId === appId);

    if (existing) {
      if (existing.id === activeTabId && !existing.isPinned) {
        get().closeTab(existing.id);
      } else {
        get().focusTab(existing.id);
      }
      return;
    }

    const newTab: OSTab = {
      id: crypto.randomUUID(),
      appId,
      title,
      isActive: false,
      isPinned: false,
    };

    set((state) => ({
      tabs: [
        ...state.tabs.map((t) => ({ ...t, isActive: false })),
        { ...newTab, isActive: true },
      ],
      activeTabId: newTab.id,
    }));
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || tab.isPinned) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);
    let newActiveTabId = activeTabId;

    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      const prev = tabs[idx - 1] ?? tabs[0];
      newActiveTabId = prev?.id ?? "mesa-tab";
    }

    set({
      tabs: newTabs.map((t) => ({ ...t, isActive: t.id === newActiveTabId })),
      activeTabId: newActiveTabId,
    });
  },

  focusTab: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((t) => ({ ...t, isActive: t.id === tabId })),
      activeTabId: tabId,
    }));
  },

  reorderTabs: (fromIndex, toIndex) => {
    const { tabs } = get();
    const result = [...tabs];
    const [removed] = result.splice(fromIndex, 1);
    if (removed !== undefined) {
      result.splice(toIndex, 0, removed);
    }
    set({ tabs: result });
  },

  setDockOrder: (order) => {
    localStorage.setItem("aethereos-dock-order", JSON.stringify(order));
    set({ dockOrder: order });
  },

  setHiddenDockApps: (hidden) => {
    localStorage.setItem("aethereos-hidden-dock-apps", JSON.stringify(hidden));
    set({ hiddenDockApps: hidden });
  },

  toggleDockApp: (appId) => {
    const { hiddenDockApps } = get();
    const newHidden = hiddenDockApps.includes(appId)
      ? hiddenDockApps.filter((id) => id !== appId)
      : [...hiddenDockApps, appId];
    localStorage.setItem(
      "aethereos-hidden-dock-apps",
      JSON.stringify(newHidden),
    );
    set({ hiddenDockApps: newHidden });
  },
}));
