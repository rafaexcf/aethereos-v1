import React from "react";
import type { OSApp } from "../types/os";

function makePlaceholder(appName: string, sprintTarget?: string) {
  return React.lazy(() =>
    import("../components/AppPlaceholder").then((m) => ({
      default: () =>
        React.createElement(m.AppPlaceholder, {
          appName,
          ...(sprintTarget !== undefined ? { sprintTarget } : {}),
        }),
    })),
  );
}

export const APP_REGISTRY: OSApp[] = [
  {
    id: "mesa",
    name: "Mesa",
    icon: "Monitor",
    color: "#64748b",
    component: React.lazy(() =>
      import("./mesa/MesaApp").then((m) => ({ default: m.MesaApp })),
    ),
    showInDock: false,
    closeable: false,
    hasInternalNav: false,
    alwaysEnabled: true,
  },
  {
    id: "drive",
    name: "Drive",
    icon: "HardDrive",
    color: "#06b6d4",
    component: React.lazy(() =>
      import("./drive/index").then((m) => ({ default: m.DriveApp })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "pessoas",
    name: "Pessoas",
    icon: "Users",
    color: "#8b5cf6",
    component: React.lazy(() =>
      import("./pessoas/index").then((m) => ({ default: m.PessoasApp })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "chat",
    name: "Mensagens",
    icon: "MessageSquare",
    color: "#06b6d4",
    component: React.lazy(() =>
      import("./chat/index").then((m) => ({ default: m.ChatApp })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "settings",
    name: "Configurações",
    icon: "Settings",
    color: "#64748b",
    component: React.lazy(() =>
      import("./configuracoes/index").then((m) => ({
        default: m.ConfiguracoesApp,
      })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "ae-ai",
    name: "AE AI",
    icon: "Bot",
    color: "#8b5cf6",
    component: makePlaceholder("AE AI"),
    showInDock: true,
    closeable: false,
    hasInternalNav: false,
    alwaysEnabled: true,
    opensAsModal: true,
  },
  {
    id: "governanca",
    name: "Governança",
    icon: "Shield",
    color: "#ef4444",
    component: React.lazy(() =>
      import("./governanca/index").then((m) => ({ default: m.GovernancaApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
    requiresAdmin: true,
  },
  {
    id: "auditoria",
    name: "Auditoria",
    icon: "ClipboardList",
    color: "#f59e0b",
    component: React.lazy(() =>
      import("./auditoria/index").then((m) => ({ default: m.AuditoriaApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
    requiresAdmin: true,
  },
  {
    id: "comercio",
    name: "Comércio Digital",
    icon: "ShoppingCart",
    color: "#f0fc05",
    component: makePlaceholder("Comércio Digital", "Sprint 12"),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
    requiresCompany: true,
  },
  {
    id: "logitix",
    name: "LOGITIX",
    icon: "Truck",
    color: "#059669",
    component: makePlaceholder("LOGITIX", "Sprint 12"),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
    requiresCompany: true,
  },
  {
    id: "erp",
    name: "ERP",
    icon: "BarChart3",
    color: "#7c3aed",
    component: makePlaceholder("ERP", "Sprint 13"),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
    requiresCompany: true,
  },
  {
    id: "crm",
    name: "CRM Vendas",
    icon: "TrendingUp",
    color: "#f97316",
    component: makePlaceholder("CRM Vendas", "Sprint 13"),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
    requiresCompany: true,
  },
  {
    id: "magic-store",
    name: "Magic Store",
    icon: "Store",
    color: "#0ea5e9",
    component: makePlaceholder("Magic Store", "Sprint 11"),
    showInDock: true,
    closeable: true,
    hasInternalNav: false,
  },
];

export function getApp(id: string): OSApp | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}

export function getVisibleDockApps(): OSApp[] {
  return APP_REGISTRY.filter((a) => a.showInDock);
}

export function prefetchApp(appId: string): void {
  const app = getApp(appId);
  if (app?.component) {
    const lazy = app.component as unknown as { _payload?: unknown };
    void lazy._payload;
  }
}
