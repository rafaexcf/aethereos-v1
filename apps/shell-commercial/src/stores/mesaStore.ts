import { create } from "zustand";
import { useSessionStore } from "./session";
import type { MesaItem } from "../types/os";

export const WALLPAPERS = [
  "design-3",
  "design-2",
  "black-hole",
  "galaxy",
  "art-1",
  "art-2",
] as const;
export type WallpaperId = (typeof WALLPAPERS)[number];

export const WALLPAPER_NAMES: Record<WallpaperId, string> = {
  "design-3": "Wallpaper 1",
  "design-2": "Wallpaper 2",
  "black-hole": "Buraco Negro",
  galaxy: "Galáxia",
  "art-1": "Terra",
  "art-2": "Aether",
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

const DEFAULT_WALLPAPER = "design-3";

export const DEFAULT_LAYOUT: MesaItem[] = [
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
    id: "icon-chat",
    type: "icon",
    appId: "chat",
    position: { x: 120, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Mensagens" },
    zIndex: 0,
  },
  {
    id: "icon-settings",
    type: "icon",
    appId: "settings",
    position: { x: 220, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "Configurações" },
    zIndex: 0,
  },
  {
    id: "icon-rh",
    type: "icon",
    appId: "rh",
    position: { x: 320, y: 20 },
    size: { w: 80, h: 80 },
    config: { name: "RH" },
    zIndex: 0,
  },
  {
    id: "icon-magic-store",
    type: "icon",
    appId: "magic-store",
    position: { x: 420, y: 20 },
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
  /** Adiciona widget de um app na proxima area livre da mesa. */
  addWidget: (appId: string, size: { w: number; h: number }) => void;
  /** Fixa icone do app na mesa. No-op se ja existir. */
  addIcon: (appId: string) => void;
  /** Remove um item (icon ou widget) por id. */
  removeItem: (itemId: string) => void;
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

  addWidget: (appId, size) => {
    const { layout, wallpaper, wallpaperUrl } = get();
    // Posicionamento heuristico: encontra primeiro slot livre num grid 240px
    // a partir do canto superior direito (apos os icones de coluna 1-2).
    const { x, y } = findNextFreeSlot(layout, size);
    const id = `widget-${appId}-${Date.now()}`;
    const next: MesaItem[] = [
      ...layout,
      {
        id,
        type: "widget",
        appId,
        position: { x, y },
        size,
        config: {},
        zIndex: 0,
      },
    ];
    set({ layout: next });
    scheduleSave(next, wallpaper, wallpaperUrl);
  },

  addIcon: (appId) => {
    const { layout, wallpaper, wallpaperUrl } = get();
    // No-op se app ja tem icone na mesa.
    if (layout.some((it) => it.type === "icon" && it.appId === appId)) {
      return;
    }
    const size = { w: 80, h: 80 };
    const { x, y } = findNextIconSlot(layout, size);
    const id = `icon-${appId}-${Date.now()}`;
    const next: MesaItem[] = [
      ...layout,
      {
        id,
        type: "icon",
        appId,
        position: { x, y },
        size,
        config: {},
        zIndex: 0,
      },
    ];
    set({ layout: next });
    scheduleSave(next, wallpaper, wallpaperUrl);
  },

  removeItem: (itemId) => {
    const { layout, wallpaper, wallpaperUrl } = get();
    const next = layout.filter((it) => it.id !== itemId);
    if (next.length === layout.length) return;
    set({ layout: next });
    scheduleSave(next, wallpaper, wallpaperUrl);
  },
}));

// Heuristica simples: tenta posicoes em grid (gap 16px) percorrendo da
// direita pra baixo, evitando colisao com items existentes.
function findNextFreeSlot(
  layout: MesaItem[],
  size: { w: number; h: number },
): { x: number; y: number } {
  const PAD = 16;
  const startX = 220; // depois da fileira inicial de icones (~5 x 100)
  const startY = 120;
  const cols = 4;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (size.w + PAD);
      const y = startY + row * (size.h + PAD);
      const collides = layout.some((it) =>
        rectsOverlap(
          { x, y, w: size.w, h: size.h },
          {
            x: it.position.x,
            y: it.position.y,
            w: it.size.w,
            h: it.size.h,
          },
        ),
      );
      if (!collides) return { x, y };
    }
  }
  // Fallback: empilhamento offset (raramente atingido).
  return { x: startX + Math.random() * 40, y: 120 + Math.random() * 40 };
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// Icones percorrem coluna por linha — alinha com o padrao do DEFAULT_LAYOUT
// (linha 1: x=20, 120, 220, 320, 420, 520; gap 100; padding 20).
function findNextIconSlot(
  layout: MesaItem[],
  size: { w: number; h: number },
): { x: number; y: number } {
  const COLS = [20, 120, 220, 320, 420, 520, 620];
  const ROW_GAP = 20;
  for (let row = 0; row < 8; row++) {
    for (const x of COLS) {
      const y = 20 + row * (size.h + ROW_GAP);
      const collides = layout.some((it) =>
        rectsOverlap(
          { x, y, w: size.w, h: size.h },
          {
            x: it.position.x,
            y: it.position.y,
            w: it.size.w,
            h: it.size.h,
          },
        ),
      );
      if (!collides) return { x, y };
    }
  }
  return { x: 20, y: 20 };
}
