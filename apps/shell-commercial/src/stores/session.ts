import { create } from "zustand";
import type { CloudDrivers } from "../lib/drivers";

interface SessionState {
  isBooted: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  /** Companies do usuário (do JWT custom claim) */
  companies: string[];
  /** Company ativa para esta sessão */
  activeCompanyId: string | null;
  drivers: CloudDrivers | null;
}

interface SessionActions {
  setBooted: (drivers: CloudDrivers) => void;
  setAuthSession: (params: {
    userId: string;
    email: string | undefined;
    accessToken: string;
    companies: string[];
    activeCompanyId: string | null;
  }) => void;
  setActiveCompany: (companyId: string) => void;
  clearSession: () => void;
}

type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
  isBooted: false,
  userId: null,
  email: null,
  accessToken: null,
  companies: [],
  activeCompanyId: null,
  drivers: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  setBooted: (drivers) => set({ isBooted: true, drivers }),

  setAuthSession: ({
    userId,
    email,
    accessToken,
    companies,
    activeCompanyId,
  }) =>
    set({
      userId,
      accessToken,
      companies,
      activeCompanyId,
      ...(email !== undefined ? { email } : {}),
    }),

  setActiveCompany: (activeCompanyId) =>
    set((state) => {
      if (state.drivers !== null) {
        state.drivers.auth.withCompanyContext(activeCompanyId);
      }
      return { activeCompanyId };
    }),

  clearSession: () =>
    set((state) => ({
      ...initialState,
      isBooted: state.isBooted,
      drivers: state.drivers,
    })),
}));
