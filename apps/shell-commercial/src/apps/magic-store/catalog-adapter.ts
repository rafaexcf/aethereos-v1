import { useMemo } from "react";
import type {
  MagicStoreApp,
  MagicStoreCategory,
  MagicStoreSourceType,
} from "../../data/magic-store-catalog";
import {
  useAppRegistryStore,
  type AppRegistryEntry,
  type EntryMode,
} from "../../stores/appRegistryStore";

/**
 * Sprint 21 MX115 — adapter de AppRegistryEntry (banco) -> MagicStoreApp
 * (forma esperada pela UI da Magic Store).
 *
 * Magic Store nao mostra apps system (mesa, magic-store, settings,
 * notifications, lixeira, governanca, auditoria) — sao componentes do OS.
 * Filtro por categoria 'system' aqui em vez de na UI.
 */

const HIDDEN_FROM_STORE = new Set<string>([
  "mesa",
  "magic-store",
  "settings",
  "notifications",
  "lixeira",
  "governanca",
  "auditoria",
]);

function entryModeToSourceType(mode: EntryMode): MagicStoreSourceType {
  switch (mode) {
    case "internal":
      return "internal";
    case "iframe":
      return "iframe";
    case "weblink":
      return "weblink";
  }
}

function entryToMagicStoreApp(entry: AppRegistryEntry): MagicStoreApp | null {
  if (HIDDEN_FROM_STORE.has(entry.id)) return null;
  if (entry.category === "system") return null;

  const sourceTarget =
    entry.entry_mode === "internal"
      ? entry.id
      : (entry.entry_url ?? entry.external_url ?? "");

  // Schema CHECK do banco nao tem 'beta'/'coming_soon' como status.
  // Mapeamento: published -> available, draft -> coming_soon.
  const status: MagicStoreApp["status"] =
    entry.status === "draft" ? "coming_soon" : "available";

  const type: MagicStoreApp["type"] =
    entry.app_type === "native" ? "module" : "standalone";

  // requiresPro derivado: vertical proprietaria
  const requiresPro =
    entry.category === "vertical" &&
    entry.license.toLowerCase().includes("proprietar");

  const out: MagicStoreApp = {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    longDescription: entry.long_description,
    icon: entry.icon,
    color: entry.color,
    category: entry.category as Exclude<
      MagicStoreCategory,
      "all" | "beta" | "coming_soon" | "installed"
    >,
    type,
    source: {
      type: entryModeToSourceType(entry.entry_mode),
      target: sourceTarget,
    },
    status,
    license: entry.license,
    offlineCapable: entry.offline_capable,
    installable: entry.installable,
    tags: entry.tags,
  };
  if (entry.external_url !== null) out.externalUrl = entry.external_url;
  if (entry.app_type === "native") out.moduleKey = entry.id;
  if (requiresPro) out.requiresPro = true;
  return out;
}

/**
 * Hook que retorna o catalogo da Magic Store derivado do appRegistryStore.
 * Reativo — re-renderiza quando a Map de apps muda (loadApps termina).
 */
export function useMagicStoreCatalog(): MagicStoreApp[] {
  const apps = useAppRegistryStore((s) => s.apps);
  return useMemo(() => {
    const out: MagicStoreApp[] = [];
    for (const entry of apps.values()) {
      const adapted = entryToMagicStoreApp(entry);
      if (adapted !== null) out.push(adapted);
    }
    return out;
  }, [apps]);
}
