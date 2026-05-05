import { create } from "zustand";

// Tab ids do app Configuracoes — replicado aqui pra evitar dependencia
// circular com o componente. Manter em sync com TabId em
// apps/configuracoes/index.tsx.
export type SettingsTabId =
  | "home"
  | "minha-empresa"
  | "perfil"
  | "notificacoes"
  | "dados-privacidade"
  | "dock"
  | "mesa"
  | "aparencia"
  | "sobre";

interface SettingsNavState {
  pendingTab: SettingsTabId | null;
  setPendingTab: (tab: SettingsTabId) => void;
  clearPendingTab: () => void;
}

export const useSettingsNavStore = create<SettingsNavState>((set) => ({
  pendingTab: null,
  setPendingTab: (tab) => set({ pendingTab: tab }),
  clearPendingTab: () => set({ pendingTab: null }),
}));
