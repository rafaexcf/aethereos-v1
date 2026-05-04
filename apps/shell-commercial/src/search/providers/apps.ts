import { APP_REGISTRY } from "../../apps/registry";
import { useInstalledModulesStore } from "../../stores/installedModulesStore";
import type { SearchProvider, SearchResult } from "../types";

export const appsProvider: SearchProvider = {
  id: "apps",
  label: "Aplicativos",
  icon: "LayoutGrid",
  maxResults: 8,

  async search(query, ctx) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Sprint 16 MX79: respeita visibilidade (alwaysEnabled OR installed)
    const installed = useInstalledModulesStore.getState().installed;
    return APP_REGISTRY.filter(
      (app) =>
        app.name.toLowerCase().includes(q) &&
        (app.alwaysEnabled === true || installed.has(app.id)),
    )
      .slice(0, 8)
      .map<SearchResult>((app) => ({
        id: `app-${app.id}`,
        type: "app",
        title: app.name,
        subtitle: "Aplicativo",
        icon: app.icon,
        iconColor: app.color,
        action: () => {
          ctx.openApp(app.id, app.name);
          ctx.closeSearch();
        },
      }));
  },
};
