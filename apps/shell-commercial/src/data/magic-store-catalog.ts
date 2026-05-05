// Sprint 21 MX116: o array MAGIC_STORE_CATALOG e os helpers (filterCatalog,
// searchCatalog) foram removidos. Catalogo agora vive em kernel.app_registry
// e eh consumido via apps/magic-store/catalog-adapter.ts.
//
// Esse arquivo foi reduzido aos types — preservados como contrato da UI da
// Magic Store. Nova fonte: appRegistryStore.

export type MagicStoreCategory =
  | "all"
  | "vertical"
  | "optional"
  | "ai"
  | "productivity"
  | "games"
  | "utilities"
  | "puter"
  | "dev-tools"
  | "design"
  | "data"
  | "beta"
  | "coming_soon"
  | "installed";

export type MagicStoreSourceType = "internal" | "iframe" | "weblink";

export interface MagicStoreSource {
  type: MagicStoreSourceType;
  target: string;
}

export interface MagicStoreApp {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  category: Exclude<
    MagicStoreCategory,
    "all" | "beta" | "coming_soon" | "installed"
  >;
  type: "standalone" | "module";
  source: MagicStoreSource;
  externalUrl?: string;
  moduleKey?: string;
  status: "available" | "coming_soon" | "beta";
  license: string;
  offlineCapable: boolean;
  installable: boolean;
  requiresPro?: boolean;
  tags: string[];
}
