import React, { type ComponentType, type LazyExoticComponent } from "react";
import type { OSApp } from "../types/os";
import { lazyWithRetry } from "../lib/lazy-with-retry";

// ADR-0024: Camada 1 é OS B2B genérico. Apps verticais (Comércio, LOGITIX, ERP)
// são Camada 2 standalone — não vivem aqui. Magic Store é o launcher deles.

function makePlaceholder(appName: string, sprintTarget?: string) {
  return lazyWithRetry(() =>
    import("../components/AppPlaceholder").then((m) => ({
      default: () =>
        React.createElement(m.AppPlaceholder, {
          appName,
          ...(sprintTarget !== undefined ? { sprintTarget } : {}),
        }),
    })),
  );
}

// ─── Sprint 21 MX113: COMPONENT_MAP ──────────────────────────────────────────
//
// Mapeamento leve appId -> componente React.lazy. Substitui (em conjunto com
// kernel.app_registry no banco e appRegistryStore) o array APP_REGISTRY como
// source-of-truth de metadata.
//
// Apenas apps NATIVOS aparecem aqui — apps iframe/weblink usam IframeAppFrame
// ou WebLinkOpener e nao precisam de entrada nesta tabela (R11 do Sprint 21).
//
// APP_REGISTRY abaixo permanece como compat layer durante a transicao
// (consumido por Dock/Mesa/TabBar/AppFrame ate MX114).

export const COMPONENT_MAP: Record<
  string,
  LazyExoticComponent<ComponentType>
> = {
  mesa: lazyWithRetry(() =>
    import("./mesa/MesaApp").then((m) => ({ default: m.MesaApp })),
  ),
  drive: lazyWithRetry(() =>
    import("./drive/index").then((m) => ({ default: m.DriveApp })),
  ),
  chat: lazyWithRetry(() =>
    import("./chat/index").then((m) => ({ default: m.ChatApp })),
  ),
  rh: lazyWithRetry(() =>
    import("./rh/index").then((m) => ({ default: m.RHApp })),
  ),
  "magic-store": lazyWithRetry(() =>
    import("./magic-store/index").then((m) => ({ default: m.MagicStoreApp })),
  ),
  weather: lazyWithRetry(() =>
    import("./weather/index").then((m) => ({ default: m.WeatherApp })),
  ),
  settings: lazyWithRetry(() =>
    import("./configuracoes/index").then((m) => ({
      default: m.ConfiguracoesApp,
    })),
  ),
  notifications: lazyWithRetry(() =>
    import("./notifications/NotificationsApp").then((m) => ({
      default: m.NotificationsApp,
    })),
  ),
  gestor: lazyWithRetry(() =>
    import("./gestor/index").then((m) => ({ default: m.GestorApp })),
  ),
  "ae-ai": makePlaceholder("Aether AI"),
  calendar: lazyWithRetry(() =>
    import("./calendario/CalendarApp").then((m) => ({
      default: m.CalendarApp,
    })),
  ),
  governanca: lazyWithRetry(() =>
    import("./governanca/index").then((m) => ({ default: m.GovernancaApp })),
  ),
  auditoria: lazyWithRetry(() =>
    import("./auditoria/index").then((m) => ({ default: m.AuditoriaApp })),
  ),
  "bloco-de-notas": lazyWithRetry(() =>
    import("./bloco-de-notas/index").then((m) => ({
      default: m.BlocoDeNotasApp,
    })),
  ),
  tarefas: lazyWithRetry(() =>
    import("./tarefas/index").then((m) => ({ default: m.TarefasApp })),
  ),
  "agenda-telefonica": lazyWithRetry(() =>
    import("./agenda-telefonica/index").then((m) => ({
      default: m.AgendaTelefonicaApp,
    })),
  ),
  calculadora: lazyWithRetry(() =>
    import("./calculadora/index").then((m) => ({ default: m.CalculadoraApp })),
  ),
  relogio: lazyWithRetry(() =>
    import("./relogio/index").then((m) => ({ default: m.RelogioApp })),
  ),
  camera: lazyWithRetry(() =>
    import("./camera/index").then((m) => ({ default: m.CameraApp })),
  ),
  "gravador-de-voz": lazyWithRetry(() =>
    import("./gravador-de-voz/index").then((m) => ({
      default: m.GravadorDeVozApp,
    })),
  ),
  enquetes: lazyWithRetry(() =>
    import("./enquetes/index").then((m) => ({ default: m.EnquetesApp })),
  ),
  navegador: lazyWithRetry(() =>
    import("./navegador/index").then((m) => ({ default: m.NavegadorApp })),
  ),
  kanban: lazyWithRetry(() =>
    import("./kanban/index").then((m) => ({ default: m.KanbanApp })),
  ),
  lixeira: lazyWithRetry(() =>
    import("./lixeira/index").then((m) => ({ default: m.LixeiraApp })),
  ),
  planilhas: lazyWithRetry(() =>
    import("./planilhas/index").then((m) => ({ default: m.PlanilhasApp })),
  ),
  documentos: lazyWithRetry(() =>
    import("./documentos/index").then((m) => ({ default: m.DocumentosApp })),
  ),
  apresentacoes: lazyWithRetry(() =>
    import("./apresentacoes/index").then((m) => ({
      default: m.ApresentacoesApp,
    })),
  ),
  pdf: lazyWithRetry(() =>
    import("./pdf/index").then((m) => ({ default: m.PdfApp })),
  ),
  automacoes: lazyWithRetry(() =>
    import("./automacoes/index").then((m) => ({ default: m.AutomacoesApp })),
  ),
  reuniao: lazyWithRetry(() =>
    import("./reuniao/index").then((m) => ({ default: m.ReuniaoApp })),
  ),
};

/** Resolve componente React.lazy de um app nativo. null para iframe/weblink. */
export function getComponent(
  appId: string,
): LazyExoticComponent<ComponentType> | null {
  return COMPONENT_MAP[appId] ?? null;
}

export const APP_REGISTRY: OSApp[] = [
  {
    id: "mesa",
    name: "Mesa",
    icon: "Monitor",
    color: "#64748b",
    component: lazyWithRetry(() =>
      import("./mesa/MesaApp").then((m) => ({ default: m.MesaApp })),
    ),
    showInDock: false,
    closeable: false,
    hasInternalNav: false,
    alwaysEnabled: true,
  },
  {
    id: "drive",
    name: "Æ Drive",
    icon: "HardDrive",
    color: "#06b6d4",
    component: lazyWithRetry(() =>
      import("./drive/index").then((m) => ({ default: m.DriveApp })),
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
    component: lazyWithRetry(() =>
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
    color: "#8b5cf6",
    component: lazyWithRetry(() =>
      import("./rh/index").then((m) => ({ default: m.RHApp })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "magic-store",
    name: "Æ Magic Store",
    icon: "Store",
    color: "#0ea5e9",
    component: lazyWithRetry(() =>
      import("./magic-store/index").then((m) => ({ default: m.MagicStoreApp })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: false,
    alwaysEnabled: true,
  },
  {
    id: "weather",
    name: "Tempo",
    icon: "CloudSun",
    color: "#60a5fa",
    component: lazyWithRetry(() =>
      import("./weather/index").then((m) => ({ default: m.WeatherApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "settings",
    name: "Configurações",
    icon: "Settings",
    color: "#64748b",
    component: lazyWithRetry(() =>
      import("./configuracoes/index").then((m) => ({
        default: m.ConfiguracoesApp,
      })),
    ),
    showInDock: true,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "notifications",
    name: "Notificações",
    icon: "Bell",
    color: "#8b5cf6",
    component: lazyWithRetry(() =>
      import("./notifications/NotificationsApp").then((m) => ({
        default: m.NotificationsApp,
      })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "gestor",
    name: "Gestor",
    icon: "BriefcaseBusiness",
    color: "#6366f1",
    component: lazyWithRetry(() =>
      import("./gestor/index").then((m) => ({ default: m.GestorApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
    requiresAdmin: true,
  },
  {
    id: "ae-ai",
    name: "Aether AI",
    icon: "Bot",
    color: "#8b5cf6",
    component: makePlaceholder("Aether AI"),
    showInDock: true,
    closeable: false,
    hasInternalNav: false,
    alwaysEnabled: true,
    opensAsModal: true,
  },
  {
    id: "calendar",
    name: "Calendário",
    icon: "CalendarDays",
    color: "#8b5cf6",
    component: lazyWithRetry(() =>
      import("./calendario/CalendarApp").then((m) => ({
        default: m.CalendarApp,
      })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "governanca",
    name: "Governança",
    icon: "Shield",
    color: "#ef4444",
    component: lazyWithRetry(() =>
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
    component: lazyWithRetry(() =>
      import("./auditoria/index").then((m) => ({ default: m.AuditoriaApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
    requiresAdmin: true,
  },
  {
    id: "bloco-de-notas",
    name: "Bloco de Notas",
    icon: "StickyNote",
    color: "#f59e0b",
    component: lazyWithRetry(() =>
      import("./bloco-de-notas/index").then((m) => ({
        default: m.BlocoDeNotasApp,
      })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "tarefas",
    name: "Tarefas",
    icon: "ListChecks",
    color: "#3b82f6",
    component: lazyWithRetry(() =>
      import("./tarefas/index").then((m) => ({ default: m.TarefasApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "agenda-telefonica",
    name: "Contatos Telefônicos",
    icon: "BookUser",
    color: "#10b981",
    component: lazyWithRetry(() =>
      import("./agenda-telefonica/index").then((m) => ({
        default: m.AgendaTelefonicaApp,
      })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "calculadora",
    name: "Calculadora",
    icon: "Calculator",
    color: "#f97316",
    component: lazyWithRetry(() =>
      import("./calculadora/index").then((m) => ({
        default: m.CalculadoraApp,
      })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "relogio",
    name: "Relógio",
    icon: "Clock",
    color: "#6366f1",
    component: lazyWithRetry(() =>
      import("./relogio/index").then((m) => ({ default: m.RelogioApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "camera",
    name: "Câmera",
    icon: "Camera",
    color: "#1a1a2e",
    component: lazyWithRetry(() =>
      import("./camera/index").then((m) => ({ default: m.CameraApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "gravador-de-voz",
    name: "Gravador de Voz",
    icon: "Mic",
    color: "#ef4444",
    component: lazyWithRetry(() =>
      import("./gravador-de-voz/index").then((m) => ({
        default: m.GravadorDeVozApp,
      })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "enquetes",
    name: "Enquetes",
    icon: "Vote",
    color: "#6366f1",
    component: lazyWithRetry(() =>
      import("./enquetes/index").then((m) => ({ default: m.EnquetesApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "navegador",
    name: "Navegador",
    icon: "Globe",
    color: "#0ea5e9",
    component: lazyWithRetry(() =>
      import("./navegador/index").then((m) => ({ default: m.NavegadorApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "kanban",
    name: "Kanban",
    icon: "Kanban",
    color: "#6366f1",
    component: lazyWithRetry(() =>
      import("./kanban/index").then((m) => ({ default: m.KanbanApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "lixeira",
    name: "Lixeira",
    icon: "Trash2",
    color: "#64748b",
    component: lazyWithRetry(() =>
      import("./lixeira/index").then((m) => ({ default: m.LixeiraApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "planilhas",
    name: "Planilhas",
    icon: "Grid3x3",
    color: "#10b981",
    component: lazyWithRetry(() =>
      import("./planilhas/index").then((m) => ({ default: m.PlanilhasApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "documentos",
    name: "Documentos",
    icon: "FileText",
    color: "#3b82f6",
    component: lazyWithRetry(() =>
      import("./documentos/index").then((m) => ({ default: m.DocumentosApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "apresentacoes",
    name: "Apresentações",
    icon: "Monitor",
    color: "#f59e0b",
    component: lazyWithRetry(() =>
      import("./apresentacoes/index").then((m) => ({
        default: m.ApresentacoesApp,
      })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "pdf",
    name: "PDF",
    icon: "FileText",
    color: "#ef4444",
    component: lazyWithRetry(() =>
      import("./pdf/index").then((m) => ({ default: m.PdfApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "automacoes",
    name: "Automações",
    icon: "Workflow",
    color: "#10b981",
    component: lazyWithRetry(() =>
      import("./automacoes/index").then((m) => ({ default: m.AutomacoesApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
  },
  {
    id: "reuniao",
    name: "Reuniões",
    icon: "Video",
    color: "#0ea5e9",
    component: lazyWithRetry(() =>
      import("./reuniao/index").then((m) => ({ default: m.ReuniaoApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
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
