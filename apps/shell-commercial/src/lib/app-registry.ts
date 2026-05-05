import type { ComponentType } from "react";
import { lazy } from "react";

export interface AppDefinition {
  id: string;
  label: string;
  icon: string;
  /** Role mínima para ver o app no Dock */
  minRole?: "member" | "admin" | "owner" | "staff";
  component: ComponentType;
}

// Lazy loading para code splitting por app
const DriveApp = lazy(() =>
  import("../apps/drive/index").then((m) => ({ default: m.DriveApp })),
);

const ChatApp = lazy(() =>
  import("../apps/chat/index").then((m) => ({ default: m.ChatApp })),
);

const ConfiguracoesApp = lazy(() =>
  import("../apps/configuracoes/index").then((m) => ({
    default: m.ConfiguracoesApp,
  })),
);

const GovernancaApp = lazy(() =>
  import("../apps/governanca/index").then((m) => ({
    default: m.GovernancaApp,
  })),
);

const AuditoriaApp = lazy(() =>
  import("../apps/auditoria/index").then((m) => ({
    default: m.AuditoriaApp,
  })),
);

export const APP_REGISTRY: AppDefinition[] = [
  {
    id: "drive",
    label: "Drive",
    icon: "📁",
    minRole: "member",
    component: DriveApp,
  },
  {
    id: "chat",
    label: "Chat",
    icon: "💬",
    minRole: "member",
    component: ChatApp,
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: "⚙️",
    minRole: "member",
    component: ConfiguracoesApp,
  },
  {
    id: "governanca",
    label: "Governança",
    icon: "🛡️",
    minRole: "admin",
    component: GovernancaApp,
  },
  {
    id: "auditoria",
    label: "Auditoria",
    icon: "📋",
    minRole: "admin",
    component: AuditoriaApp,
  },
];

export function getApp(id: string): AppDefinition | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
