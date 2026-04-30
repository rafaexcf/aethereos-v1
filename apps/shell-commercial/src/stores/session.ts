import { create } from "zustand";
import type { CloudDrivers } from "../lib/drivers";

interface SessionState {
  isBooted: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Companies do usuário (do JWT custom claim) */
  companies: string[];
  /** Company ativa para esta sessão */
  activeCompanyId: string | null;
  /** true se o JWT contém is_staff=true (Aethereos internal staff) */
  isStaff: boolean;
  /** true se o JWT contém is_platform_admin=true (aprovação de tenants, etc.) */
  isPlatformAdmin: boolean;
  drivers: CloudDrivers | null;
}

interface SessionActions {
  setBooted: (drivers: CloudDrivers) => void;
  setAuthSession: (params: {
    userId: string;
    email: string | undefined;
    accessToken: string;
    refreshToken: string | undefined;
    companies: string[];
    activeCompanyId: string | null;
    isStaff: boolean;
    isPlatformAdmin: boolean;
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
  refreshToken: null,
  companies: [],
  activeCompanyId: null,
  isStaff: false,
  isPlatformAdmin: false,
  drivers: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  setBooted: (drivers) => set({ isBooted: true, drivers }),

  setAuthSession: ({
    userId,
    email,
    accessToken,
    refreshToken,
    companies,
    activeCompanyId,
    isStaff,
    isPlatformAdmin,
  }) =>
    set({
      userId,
      accessToken,
      companies,
      activeCompanyId,
      isStaff,
      isPlatformAdmin,
      ...(email !== undefined ? { email } : {}),
      ...(refreshToken !== undefined ? { refreshToken } : {}),
    }),

  setActiveCompany: (activeCompanyId) =>
    set((state) => {
      if (state.drivers !== null && state.userId !== null) {
        state.drivers.auth.withCompanyContext(activeCompanyId);
        state.drivers.data.withTenant({
          company_id: activeCompanyId,
          actor: { type: "human", user_id: state.userId },
        });
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
