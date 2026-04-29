import { create } from "zustand";

interface SessionState {
  companyId: string | null;
  userId: string | null;
  isBooted: boolean;
  isSetupComplete: boolean;
}

interface SessionActions {
  setSession: (companyId: string, userId: string) => void;
  setBooted: (value: boolean) => void;
  setSetupComplete: (value: boolean) => void;
  clearSession: () => void;
}

type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
  companyId: null,
  userId: null,
  isBooted: false,
  isSetupComplete: false,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
  setSession: (companyId, userId) => set({ companyId, userId }),
  setBooted: (isBooted) => set({ isBooted }),
  setSetupComplete: (isSetupComplete) => set({ isSetupComplete }),
  clearSession: () => set(initialState),
}));
