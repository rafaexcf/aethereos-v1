import { create } from "zustand";
import { useSessionStore } from "./session";
import type { MesaItem } from "../types/os";

export const WALLPAPERS = [
  "default",
  "purple",
  "design-1",
  "design-2",
  "design-3",
  "midnight",
] as const;
export type WallpaperId = (typeof WALLPAPERS)[number];

export const WALLPAPER_NAMES: Record<WallpaperId, string> = {
  default: "Buraco Negro",
  purple: "Roxo",
  "design-1": "Marca 1",
  "design-2": "Marca 2",
  "design-3": "Marca 3",
  midnight: "Meia-Noite",
};

export const CUSTOM_WALLPAPER_ID = "custom";

export function getWallpaperStyle(
  id: string,
  customUrl: string | null = null,
): React.CSSProperties {
  if (id === CUSTOM_WALLPAPER_ID && customUrl !== null && customUrl !== "") {
    return {
      backgroundImage: `url("${customUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return { background: `var(--wallpaper-${id}, var(--bg-base))` };
}

const DEFAULT_WALLPAPER = "default";

const DEFAULT_LAYOUT: MesaItem[] = [
  {
    id: "icon-drive",
    type: "icon",
    appId: "drive",
    position: { x: 20, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Drive" },
    zIndex: 0,
  },
  {
    id: "icon-pessoas",
    type: "icon",
    appId: "pessoas",
    position: { x: 120, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Pessoas" },
    zIndex: 0,
  },
  {
    id: "icon-chat",
    type: "icon",
    appId: "chat",
    position: { x: 220, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Mensagens" },
    zIndex: 0,
  },
  {
    id: "icon-settings",
    type: "icon",
    appId: "settings",
    position: { x: 320, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Configurações" },
    zIndex: 0,
  },
  {
    id: "icon-rh",
    type: "icon",
    appId: "rh",
    position: { x: 420, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "RH" },
    zIndex: 0,
  },
  {
    id: "icon-magic-store",
    type: "icon",
    appId: "magic-store",
    position: { x: 520, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Magic Store" },
    zIndex: 0,
  },
];

interface MesaState {
  layout: MesaItem[];
  wallpaper: string;
  /** URL pública do wallpaper customizado quando wallpaper === "custom" */
  wallpaperUrl: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
}

interface MesaActions {
  fetchLayout: () => Promise<void>;
  updateLayout: (layout: MesaItem[], wallpaper?: string) => void;
  setWallpaper: (wallpaper: string) => void;
  /** Define wallpaper como custom apontando para uma URL (já uploaded) */
  setCustomWallpaper: (url: string) => void;
  /** Limpa wallpaper customizado e cai pro default */
  clearCustomWallpaper: () => void;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(
  layout: MesaItem[],
  wallpaper: string,
  wallpaperUrl: string | null,
) {
  if (saveTimeout !== null) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    void persistLayout(layout, wallpaper, wallpaperUrl);
  }, 1000);
}

async function persistLayout(
  layout: MesaItem[],
  wallpaper: string,
  wallpaperUrl: string | null,
): Promise<void> {
  const { drivers, userId, activeCompanyId } = useSessionStore.getState();
  if (drivers === null || userId === null || activeCompanyId === null) return;

  await drivers.data.from("mesa_layouts").upsert(
    {
      user_id: userId,
      company_id: activeCompanyId,
      layout,
      wallpaper,
      wallpaper_url: wallpaperUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,company_id" },
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
      const { layout, wallpaper, wallpaperUrl } = useMesaStore.getState();
      void persistLayout(layout, wallpaper, wallpaperUrl);
    }
  });
}

export const useMesaStore = create<MesaState & MesaActions>((set, get) => ({
  layout: DEFAULT_LAYOUT,
  wallpaper: DEFAULT_WALLPAPER,
  wallpaperUrl: null,
  isLoading: false,
  hasLoaded: false,

  fetchLayout: async () => {
    const { hasLoaded } = get();
    if (hasLoaded) return;

    const { drivers, userId, activeCompanyId } = useSessionStore.getState();
    if (drivers === null || userId === null || activeCompanyId === null) return;

    set({ isLoading: true });

    const { data } = await drivers.data
      .from("mesa_layouts")
      .select("layout, wallpaper, wallpaper_url")
      .eq("user_id", userId)
      .eq("company_id", activeCompanyId)
      .maybeSingle();

    if (data !== null && data !== undefined) {
      const row = data as {
        layout: MesaItem[];
        wallpaper: string;
        wallpaper_url: string | null;
      };
      set({
        layout: row.layout,
        wallpaper: row.wallpaper,
        wallpaperUrl: row.wallpaper_url ?? null,
        isLoading: false,
        hasLoaded: true,
      });
    } else {
      set({ isLoading: false, hasLoaded: true });
    }
  },

  updateLayout: (layout, wallpaper) => {
    const current = get();
    const nextWallpaper = wallpaper ?? current.wallpaper;
    set({ layout, wallpaper: nextWallpaper });
    scheduleSave(layout, nextWallpaper, current.wallpaperUrl);
  },

  setWallpaper: (wallpaper) => {
    const { layout, wallpaperUrl } = get();
    set({ wallpaper });
    scheduleSave(layout, wallpaper, wallpaperUrl);
  },

  setCustomWallpaper: (url) => {
    const { layout } = get();
    set({ wallpaper: CUSTOM_WALLPAPER_ID, wallpaperUrl: url });
    scheduleSave(layout, CUSTOM_WALLPAPER_ID, url);
  },

  clearCustomWallpaper: () => {
    const { layout } = get();
    set({ wallpaper: DEFAULT_WALLPAPER, wallpaperUrl: null });
    scheduleSave(layout, DEFAULT_WALLPAPER, null);
  },
}));
