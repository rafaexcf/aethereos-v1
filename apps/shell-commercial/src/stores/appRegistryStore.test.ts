import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useAppRegistryStore,
  getRegistryApp,
  getDockApps,
  filterVisible,
  searchApps,
} from "./appRegistryStore";
import type { CloudDrivers } from "../lib/drivers";

interface AppRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  long_description: string;
  icon: string;
  color: string;
  category: string;
  app_type: string;
  entry_mode: string;
  entry_url: string | null;
  version: string;
  status: string;
  pricing_model: string;
  permissions: string[];
  tags: string[];
  license: string;
  developer_name: string;
  show_in_dock: boolean;
  closeable: boolean;
  has_internal_nav: boolean;
  always_enabled: boolean;
  opens_as_modal: boolean;
  installable: boolean;
  offline_capable: boolean;
  external_url: string | null;
  install_count: number;
  sort_order: number;
}

const ROW_DRIVE: AppRow = {
  id: "drive",
  slug: "drive",
  name: "Drive",
  description: "Storage",
  long_description: "Storage long",
  icon: "HardDrive",
  color: "#06b6d4",
  category: "system",
  app_type: "native",
  entry_mode: "internal",
  entry_url: null,
  version: "1.0.0",
  status: "published",
  pricing_model: "free",
  permissions: [],
  tags: ["arquivos"],
  license: "BUSL-1.1",
  developer_name: "Aethereos",
  show_in_dock: true,
  closeable: true,
  has_internal_nav: true,
  always_enabled: false,
  opens_as_modal: false,
  installable: true,
  offline_capable: false,
  external_url: null,
  install_count: 0,
  sort_order: 20,
};

const ROW_AI_CLAUDE: AppRow = {
  ...ROW_DRIVE,
  id: "ai-claude",
  slug: "ai-claude",
  name: "Claude",
  description: "Anthropic",
  icon: "Sparkles",
  category: "ai",
  app_type: "external_shortcut",
  entry_mode: "weblink",
  entry_url: "https://claude.ai",
  external_url: "https://claude.ai",
  show_in_dock: false,
  always_enabled: false,
  installable: true,
  tags: ["ia"],
};

const ROW_MESA: AppRow = {
  ...ROW_DRIVE,
  id: "mesa",
  slug: "mesa",
  name: "Mesa",
  show_in_dock: false,
  always_enabled: true,
  installable: false,
};

function mkDriver(rows: AppRow[]): CloudDrivers {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const inFn = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ in: inFn });
  return {
    data: {
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as CloudDrivers["data"],
  } as CloudDrivers;
}

describe("appRegistryStore", () => {
  beforeEach(() => {
    useAppRegistryStore.getState().reset();
  });

  it("loadApps popula apps Map a partir de rows do banco", async () => {
    const driver = mkDriver([ROW_DRIVE, ROW_AI_CLAUDE, ROW_MESA]);
    await useAppRegistryStore.getState().loadApps(driver);
    const apps = useAppRegistryStore.getState().apps;
    expect(apps.size).toBe(3);
    expect(apps.get("drive")?.name).toBe("Drive");
  });

  it("hasComponent=true para apps nativos com COMPONENT_MAP", async () => {
    const driver = mkDriver([ROW_DRIVE]);
    await useAppRegistryStore.getState().loadApps(driver);
    expect(getRegistryApp("drive")?.hasComponent).toBe(true);
  });

  it("hasComponent=false para apps weblink (nao em COMPONENT_MAP)", async () => {
    const driver = mkDriver([ROW_AI_CLAUDE]);
    await useAppRegistryStore.getState().loadApps(driver);
    expect(getRegistryApp("ai-claude")?.hasComponent).toBe(false);
    expect(getRegistryApp("ai-claude")?.component).toBeNull();
  });

  it("getDockApps retorna so apps com show_in_dock=true", async () => {
    const driver = mkDriver([ROW_DRIVE, ROW_AI_CLAUDE, ROW_MESA]);
    await useAppRegistryStore.getState().loadApps(driver);
    const dock = getDockApps();
    expect(dock).toHaveLength(1);
    expect(dock[0]?.id).toBe("drive");
  });

  it("filterVisible: apps always_enabled OR installed", async () => {
    const driver = mkDriver([ROW_DRIVE, ROW_AI_CLAUDE, ROW_MESA]);
    await useAppRegistryStore.getState().loadApps(driver);
    const all = [...useAppRegistryStore.getState().apps.values()];
    const visible = filterVisible(all, new Set(["ai-claude"]));
    // mesa (always_enabled) + ai-claude (installed) = 2
    expect(visible.map((a) => a.id).sort()).toEqual(["ai-claude", "mesa"]);
  });

  it("searchApps faz match case-insensitive em name/description/tags", async () => {
    const driver = mkDriver([ROW_DRIVE, ROW_AI_CLAUDE]);
    await useAppRegistryStore.getState().loadApps(driver);
    expect(searchApps("DRIVE").map((a) => a.id)).toEqual(["drive"]);
    expect(searchApps("anthropic").map((a) => a.id)).toEqual(["ai-claude"]);
    expect(searchApps("ia").map((a) => a.id)).toEqual(["ai-claude"]);
    expect(searchApps("").length).toBe(0);
    expect(searchApps("nonexistent").length).toBe(0);
  });

  it("loadApps captura erro do banco em state.error", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    const inFn = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const driver = {
      data: {
        from: vi.fn().mockReturnValue({ select }),
      },
    } as unknown as CloudDrivers;

    await useAppRegistryStore.getState().loadApps(driver);
    expect(useAppRegistryStore.getState().error).toBe("permission denied");
    expect(useAppRegistryStore.getState().apps.size).toBe(0);
  });
});
