import React, { type ComponentType, type LazyExoticComponent } from "react";
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
  mesa: React.lazy(() =>
    import("./mesa/MesaApp").then((m) => ({ default: m.MesaApp })),
  ),
  drive: React.lazy(() =>
    import("./drive/index").then((m) => ({ default: m.DriveApp })),
  ),
  chat: React.lazy(() =>
    import("./chat/index").then((m) => ({ default: m.ChatApp })),
  ),
  rh: React.lazy(() =>
    import("./rh/index").then((m) => ({ default: m.RHApp })),
  ),
  "magic-store": React.lazy(() =>
    import("./magic-store/index").then((m) => ({ default: m.MagicStoreApp })),
  ),
  weather: React.lazy(() =>
    import("./weather/index").then((m) => ({ default: m.WeatherApp })),
  ),
  settings: React.lazy(() =>
    import("./configuracoes/index").then((m) => ({
      default: m.ConfiguracoesApp,
    })),
  ),
  notifications: React.lazy(() =>
    import("./notifications/NotificationsApp").then((m) => ({
      default: m.NotificationsApp,
    })),
  ),
  gestor: React.lazy(() =>
    import("./gestor/index").then((m) => ({ default: m.GestorApp })),
  ),
  "ae-ai": makePlaceholder("Aether AI"),
  calendar: React.lazy(() =>
    import("./calendario/CalendarApp").then((m) => ({
      default: m.CalendarApp,
    })),
  ),
  governanca: React.lazy(() =>
    import("./governanca/index").then((m) => ({ default: m.GovernancaApp })),
  ),
  auditoria: React.lazy(() =>
    import("./auditoria/index").then((m) => ({ default: m.AuditoriaApp })),
  ),
  "bloco-de-notas": React.lazy(() =>
    import("./bloco-de-notas/index").then((m) => ({
      default: m.BlocoDeNotasApp,
    })),
  ),
  tarefas: React.lazy(() =>
    import("./tarefas/index").then((m) => ({ default: m.TarefasApp })),
  ),
  "agenda-telefonica": React.lazy(() =>
    import("./agenda-telefonica/index").then((m) => ({
      default: m.AgendaTelefonicaApp,
    })),
  ),
  calculadora: React.lazy(() =>
    import("./calculadora/index").then((m) => ({ default: m.CalculadoraApp })),
  ),
  relogio: React.lazy(() =>
    import("./relogio/index").then((m) => ({ default: m.RelogioApp })),
  ),
  camera: React.lazy(() =>
    import("./camera/index").then((m) => ({ default: m.CameraApp })),
  ),
  "gravador-de-voz": React.lazy(() =>
    import("./gravador-de-voz/index").then((m) => ({
      default: m.GravadorDeVozApp,
    })),
  ),
  enquetes: React.lazy(() =>
    import("./enquetes/index").then((m) => ({ default: m.EnquetesApp })),
  ),
  navegador: React.lazy(() =>
    import("./navegador/index").then((m) => ({ default: m.NavegadorApp })),
  ),
  kanban: React.lazy(() =>
    import("./kanban/index").then((m) => ({ default: m.KanbanApp })),
  ),
  lixeira: React.lazy(() =>
    import("./lixeira/index").then((m) => ({ default: m.LixeiraApp })),
  ),
  planilhas: React.lazy(() =>
    import("./planilhas/index").then((m) => ({ default: m.PlanilhasApp })),
  ),
  documentos: React.lazy(() =>
    import("./documentos/index").then((m) => ({ default: m.DocumentosApp })),
  ),
  apresentacoes: React.lazy(() =>
    import("./apresentacoes/index").then((m) => ({
      default: m.ApresentacoesApp,
    })),
  ),
  pdf: React.lazy(() =>
    import("./pdf/index").then((m) => ({ default: m.PdfApp })),
  ),
  automacoes: React.lazy(() =>
    import("./automacoes/index").then((m) => ({ default: m.AutomacoesApp })),
  ),
  reuniao: React.lazy(() =>
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
    name: "Æ Drive",
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
    color: "#8b5cf6",
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    id: "notifications",
    name: "Notificações",
    icon: "Bell",
    color: "#8b5cf6",
    component: React.lazy(() =>
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
    component: React.lazy(() =>
      import("./gestor/index").then((m) => ({ default: m.GestorApp })),
    ),
    showInDock: false,
    closeable: true,
    hasInternalNav: true,
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
    component: React.lazy(() =>
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
    id: "bloco-de-notas",
    name: "Bloco de Notas",
    icon: "StickyNote",
    color: "#f59e0b",
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
    component: React.lazy(() =>
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
