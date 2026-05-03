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
  /** URL da foto de perfil (kernel.profiles.avatar_url) — null se não setada */
  avatarUrl: string | null;
  /** true quando a UI está bloqueada (lock screen ativa). Sessão Supabase permanece viva. */
  isLocked: boolean;
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
  setAvatarUrl: (url: string | null) => void;
  lock: () => void;
  unlock: () => void;
  clearSession: () => void;
}

type SessionStore = SessionState & SessionActions;

const LOCK_STORAGE_KEY = "aethereos:session:locked";

function readPersistedLock(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(LOCK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writePersistedLock(locked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (locked) {
      window.sessionStorage.setItem(LOCK_STORAGE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(LOCK_STORAGE_KEY);
    }
  } catch {
    // sessionStorage indisponível (modo privado/SSR) — silencioso
  }
}

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
  avatarUrl: null,
  isLocked: readPersistedLock(),
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

  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),

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

  lock: () => {
    writePersistedLock(true);
    set({ isLocked: true });
  },

  unlock: () => {
    writePersistedLock(false);
    set({ isLocked: false });
  },

  clearSession: () => {
    writePersistedLock(false);
    set((state) => ({
      ...initialState,
      isBooted: state.isBooted,
      drivers: state.drivers,
      isLocked: false,
    }));
  },
}));
