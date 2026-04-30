import React from "react";
import type { OSApp } from "../types/os";

// ADR-0024: Camada 1 é OS B2B genérico. Apps verticais (Comércio, LOGITIX, ERP)
// são Camada 2 standalone — não vivem aqui. Magic Store é o launcher deles.

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
    icon: "Contact",
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
    id: "rh",
    name: "RH",
    icon: "Users",
    color: "#10b981",
    component: React.lazy(() =>
      import("./rh/index").then((m) => ({ default: m.RHApp })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "magic-store",
    name: "Magic Store",
    icon: "Store",
    color: "#0ea5e9",
    component: React.lazy(() =>
      import("./magic-store/index").then((m) => ({ default: m.MagicStoreApp })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: false,
    alwaysEnabled: true,
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
