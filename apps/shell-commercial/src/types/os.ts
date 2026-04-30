import type { ComponentType, LazyExoticComponent } from "react";

export interface OSApp {
  id: string;
  name: string;
  icon: string;
  color: string;
  component: LazyExoticComponent<ComponentType>;
  showInDock: boolean;
  closeable: boolean;
  hasInternalNav: boolean;
  requiresCompany?: boolean;
  requiresAdmin?: boolean;
  alwaysEnabled?: boolean;
  opensAsModal?: boolean;
}

export interface OSTab {
  id: string;
  appId: string;
  title: string;
  isActive: boolean;
  isPinned: boolean;
}

export interface MesaItem {
  id: string;
  type: "icon" | "widget";
  appId: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  config: Record<string, unknown>;
  zIndex: number;
  locked?: boolean;
}
