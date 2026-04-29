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
  import("../apps/drive/index.js").then((m) => ({ default: m.DriveApp })),
);

const PessoasApp = lazy(() =>
  import("../apps/pessoas/index.js").then((m) => ({ default: m.PessoasApp })),
);

const ChatApp = lazy(() =>
  import("../apps/chat/index.js").then((m) => ({ default: m.ChatApp })),
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
    id: "pessoas",
    label: "Pessoas",
    icon: "👥",
    minRole: "member",
    component: PessoasApp,
  },
  {
    id: "chat",
    label: "Chat",
    icon: "💬",
    minRole: "member",
    component: ChatApp,
  },
];

export function getApp(id: string): AppDefinition | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
