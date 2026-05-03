import { create } from "zustand";

interface RhState {
  pendingUserId: string | null;
  setPendingUserId: (id: string) => void;
  clearPendingUserId: () => void;
}

export const useRhStore = create<RhState>((set) => ({
  pendingUserId: null,
  setPendingUserId: (id) => set({ pendingUserId: id }),
  clearPendingUserId: () => set({ pendingUserId: null }),
}));
