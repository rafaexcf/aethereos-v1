import { create } from "zustand";
import { useSessionStore } from "./session";
import type { MesaItem } from "../types/os";

export const WALLPAPERS: Record<string, string> = {
  default:
    "radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a1a 50%, #050510 100%)",
  aurora:
    "radial-gradient(ellipse at bottom left, #0a1628 0%, #0d1b2a 30%, #1a0a2e 70%, #0a0a14 100%)",
  ocean: "linear-gradient(160deg, #0c1929 0%, #0a2540 40%, #061a2e 100%)",
  midnight:
    "radial-gradient(circle at 30% 20%, #1a1040 0%, #0a0a18 60%, #050508 100%)",
  minimal: "#0f151b",
  nebula:
    "radial-gradient(ellipse at 70% 30%, #1a0a3e 0%, #0d0a2a 40%, #050510 100%)",
  forest: "linear-gradient(170deg, #0a1a0f 0%, #0d2818 40%, #061a10 100%)",
  sunset:
    "radial-gradient(ellipse at bottom, #1a1020 0%, #200a15 30%, #0a0a14 70%, #050508 100%)",
};

export function getWallpaperStyle(value: string): React.CSSProperties {
  if (value.startsWith("/") || value.startsWith("http")) {
    return {
      backgroundImage: `url(${value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (value.includes("gradient")) {
    return { backgroundImage: value };
  }
  return { backgroundColor: value };
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
    id: "icon-comercio",
    type: "icon",
    appId: "comercio",
    position: { x: 420, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Comércio Digital" },
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
  isLoading: boolean;
  hasLoaded: boolean;
}

interface MesaActions {
  fetchLayout: () => Promise<void>;
  updateLayout: (layout: MesaItem[], wallpaper?: string) => void;
  setWallpaper: (wallpaper: string) => void;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(layout: MesaItem[], wallpaper: string) {
  if (saveTimeout !== null) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    void persistLayout(layout, wallpaper);
  }, 1000);
}

async function persistLayout(
  layout: MesaItem[],
  wallpaper: string,
): Promise<void> {
  const { drivers, userId, activeCompanyId } = useSessionStore.getState();
  if (drivers === null || userId === null || activeCompanyId === null) return;

  await drivers.data.from("mesa_layouts").upsert(
    {
      user_id: userId,
      company_id: activeCompanyId,
      layout,
      wallpaper,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,company_id" },
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
      const { layout, wallpaper } = useMesaStore.getState();
      void persistLayout(layout, wallpaper);
    }
  });
}

export const useMesaStore = create<MesaState & MesaActions>((set, get) => ({
  layout: DEFAULT_LAYOUT,
  wallpaper: DEFAULT_WALLPAPER,
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
      .select("layout, wallpaper")
      .eq("user_id", userId)
      .eq("company_id", activeCompanyId)
      .maybeSingle();

    if (data !== null && data !== undefined) {
      set({
        layout: (data as { layout: MesaItem[]; wallpaper: string }).layout,
        wallpaper: (data as { layout: MesaItem[]; wallpaper: string })
          .wallpaper,
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
    scheduleSave(layout, nextWallpaper);
  },

  setWallpaper: (wallpaper) => {
    const { layout } = get();
    set({ wallpaper });
    scheduleSave(layout, wallpaper);
  },
}));
