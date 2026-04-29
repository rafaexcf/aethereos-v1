import type { ReactNode } from "react";

export interface WindowConfig {
  id: string;
  title: string;
  appId: string;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  isResizable?: boolean;
  isMinimized?: boolean;
  isMaximized?: boolean;
  zIndex?: number;
}

export interface WindowManagerProps {
  windows: WindowConfig[];
  children?: ReactNode;
  onWindowClose?: (windowId: string) => void;
  onWindowFocus?: (windowId: string) => void;
  onWindowMove?: (windowId: string, x: number, y: number) => void;
  onWindowResize?: (windowId: string, width: number, height: number) => void;
}

/**
 * WindowManager — gerenciador de janelas do shell Aethereos.
 * Placeholder: API definida, render mínimo.
 * Implementação real: react-rnd para redimensionamento/movimento.
 * Animações: CSS transitions apenas (sem framer-motion — ADR-0014 #5, bundle <500KB).
 */
export function WindowManager({ children }: WindowManagerProps) {
  return (
    <div
      data-ae="window-manager"
      className="relative w-full h-full overflow-hidden"
      style={{ zIndex: 100 }}
    >
      {children}
    </div>
  );
}
