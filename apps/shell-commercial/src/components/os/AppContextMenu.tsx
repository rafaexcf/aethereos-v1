import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  MinusCircle,
  Trash2,
  Pin,
  PanelBottom,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { useOSStore } from "../../stores/osStore";
import { useMesaStore } from "../../stores/mesaStore";
import { useDockStore } from "../../stores/dockStore";
import {
  useInstalledModulesStore,
  isProtectedModule,
} from "../../stores/installedModulesStore";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { getApp } from "../../apps/registry";

export type AppContextMenuSurface = "mesa" | "dock" | "launcher";

interface AppContextMenuProps {
  surface: AppContextMenuSurface;
  appId: string;
  /** Quando surface === "mesa", id do MesaItem (icon-...) a remover. */
  mesaIconId?: string;
  pos: { x: number; y: number };
  onClose: () => void;
}

interface MenuAction {
  label: string;
  icon: ComponentType<LucideProps>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
}

const MENU_W = 220;
const MENU_H_ESTIMATE = 220;

export function AppContextMenu({
  surface,
  appId,
  mesaIconId,
  pos,
  onClose,
}: AppContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const openApp = useOSStore((s) => s.openApp);
  const layout = useMesaStore((s) => s.layout);
  const updateLayout = useMesaStore((s) => s.updateLayout);
  const addIcon = useMesaStore((s) => s.addIcon);
  const dockOrder = useDockStore((s) => s.order);
  const addToDock = useDockStore((s) => s.addApp);
  const removeFromDock = useDockStore((s) => s.removeApp);
  const uninstallModule = useInstalledModulesStore((s) => s.uninstallModule);
  const drivers = useDrivers();
  const activeCompanyId = useSessionStore((s) => s.activeCompanyId);

  const app = getApp(appId);
  const protectedApp = isProtectedModule(appId);
  const pinnedToMesa = layout.some(
    (it) => it.type === "icon" && it.appId === appId,
  );
  const pinnedToDock = dockOrder.includes(appId);

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  if (app === undefined) return null;

  const x = Math.min(pos.x, window.innerWidth - MENU_W - 8);
  const y = Math.min(pos.y, window.innerHeight - MENU_H_ESTIMATE - 8);

  const actions: MenuAction[] = [
    {
      label: `Abrir ${app.name}`,
      icon: ExternalLink,
      onClick: () => {
        openApp(app.id, app.name);
        onClose();
      },
    },
  ];

  if (surface === "mesa" && mesaIconId !== undefined) {
    actions.push({
      label: "Remover da Mesa",
      icon: MinusCircle,
      onClick: () => {
        updateLayout(layout.filter((item) => item.id !== mesaIconId));
        onClose();
      },
      destructive: true,
    });
  }

  if (surface === "dock") {
    actions.push({
      label: "Remover da Dock",
      icon: MinusCircle,
      onClick: () => {
        removeFromDock(app.id);
        onClose();
      },
      destructive: true,
    });
  }

  if (surface === "launcher") {
    actions.push({
      label: "Fixar na Mesa",
      icon: Pin,
      onClick: () => {
        addIcon(app.id);
        onClose();
      },
      disabled: pinnedToMesa,
      ...(pinnedToMesa ? { hint: "Já fixado" } : {}),
    });
    actions.push({
      label: "Fixar na Dockbar",
      icon: PanelBottom,
      onClick: () => {
        addToDock(app.id);
        onClose();
      },
      disabled: pinnedToDock,
      ...(pinnedToDock ? { hint: "Já fixado" } : {}),
    });
  }

  if (surface === "dock" || surface === "launcher") {
    actions.push({
      label: "Desinstalar",
      icon: Trash2,
      onClick: () => {
        if (drivers === null || activeCompanyId === null) return;
        void uninstallModule(drivers, activeCompanyId, app.id);
        onClose();
      },
      destructive: true,
      disabled: protectedApp,
      ...(protectedApp ? { hint: "App protegido" } : {}),
    });
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        key={`app-ctx-${appId}`}
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          top: y,
          left: x,
          zIndex: 9999,
          width: MENU_W,
          background: "rgba(8,12,22,0.96)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          padding: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "8px 10px 6px",
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontWeight: 500,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {app.name}
        </div>
        {actions.map((item) => {
          const Icon = item.icon;
          const disabled = item.disabled === true;
          return (
            <button
              key={item.label}
              type="button"
              disabled={disabled}
              onClick={disabled ? undefined : item.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "7px 10px",
                borderRadius: 8,
                background: "transparent",
                border: "none",
                color: disabled
                  ? "rgba(255,255,255,0.25)"
                  : item.destructive === true
                    ? "rgba(252,165,165,0.92)"
                    : "rgba(255,255,255,0.82)",
                fontSize: 13,
                fontWeight: 400,
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 100ms ease",
              }}
              onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.background =
                  item.destructive === true
                    ? "rgba(239,68,68,0.10)"
                    : "rgba(255,255,255,0.07)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                style={{
                  color: disabled
                    ? "rgba(255,255,255,0.20)"
                    : item.destructive === true
                      ? "rgba(252,165,165,0.7)"
                      : "rgba(255,255,255,0.50)",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.hint !== undefined && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.32)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.hint}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
