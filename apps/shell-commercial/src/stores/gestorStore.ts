import { create } from "zustand";

export type GestorTabId =
  | "visao-geral"
  | "aplicativos"
  | "integracoes"
  | "ia"
  | "planos"
  | "cadastros"
  | "usuarios";

interface GestorState {
  pendingTab: GestorTabId | null;
  setPendingTab: (tab: GestorTabId) => void;
  clearPendingTab: () => void;
}

export const useGestorStore = create<GestorState>((set) => ({
  pendingTab: null,
  setPendingTab: (tab) => set({ pendingTab: tab }),
  clearPendingTab: () => set({ pendingTab: null }),
}));
