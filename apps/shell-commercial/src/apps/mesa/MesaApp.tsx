import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { useMesaStore, getWallpaperStyle } from "../../stores/mesaStore";
import { useOSStore } from "../../stores/osStore";
import { getApp } from "../registry";
import type { MesaItem } from "../../types/os";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  itemId: string;
}

function DesktopIcon({ item }: { item: MesaItem }) {
  const openApp = useOSStore((s) => s.openApp);
  const [selected, setSelected] = useState(false);
  const app = getApp(item.appId);

  if (!app) return null;

  const Icon =
    (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
      app.icon
    ] ?? LucideIcons.Box;

  const appId = app.id;
  const appName = app.name;

  function handleDoubleClick() {
    openApp(appId, appName);
  }

  return (
    <button
      onClick={() => setSelected((s) => !s)}
      onDoubleClick={handleDoubleClick}
      className="absolute flex flex-col items-center gap-1 cursor-pointer select-none"
      style={{
        left: item.position.x,
        top: item.position.y,
        width: 56,
      }}
    >
      <div
        className="flex items-center justify-center transition-all duration-150"
        style={{
          width: 48,
          height: 48,
          background: selected ? "rgba(37, 99, 235, 0.1)" : "var(--glass-bg)",
          border: selected
            ? "1px solid var(--border-focus)"
            : "1px solid var(--glass-border)",
          borderRadius: "var(--radius-lg)",
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            const el = e.currentTarget;
            el.style.background = "var(--glass-bg-hover)";
            el.style.borderColor = "var(--glass-border-hover)";
            el.style.boxShadow = "var(--shadow-sm)";
            el.style.transform = "scale(1.05)";
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = selected
            ? "rgba(37, 99, 235, 0.1)"
            : "var(--glass-bg)";
          el.style.borderColor = selected
            ? "var(--border-focus)"
            : "var(--glass-border)";
          el.style.boxShadow = "none";
          el.style.transform = "scale(1)";
        }}
      >
        <Icon size={24} style={{ color: app.color }} strokeWidth={1.5} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-primary)",
          textShadow: "var(--label-text-shadow)",
          maxWidth: 72,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "block",
        }}
      >
        {app.name}
      </span>
    </button>
  );
}

export function MesaApp() {
  const { layout, wallpaper, fetchLayout } = useMesaStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    itemId: "",
  });

  useEffect(() => {
    void fetchLayout();
  }, [fetchLayout]);

  useEffect(() => {
    function handleClick() {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
    if (contextMenu.visible) {
      document.addEventListener("click", handleClick);
    }
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu.visible]);

  const wallpaperStyle = getWallpaperStyle(wallpaper);
  const icons = layout.filter((item) => item.type === "icon");

  return (
    <div
      data-testid="mesa-app"
      className="h-full w-full relative overflow-hidden"
      style={wallpaperStyle}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        e.preventDefault();
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          itemId: "",
        });
      }}
    >
      {/* Grid visual sutil */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundSize: "90px 90px",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundPosition: "20px 20px",
        }}
      />

      {icons.map((item) => (
        <DesktopIcon key={item.id} item={item} />
      ))}

      {contextMenu.visible && (
        <div
          className="fixed z-50 min-w-[160px] rounded-xl overflow-hidden py-1.5"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: "rgba(30, 30, 40, 0.95)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer"
            style={{ color: "rgba(255,255,255,0.75)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
              e.currentTarget.style.color = "rgba(255,255,255,0.95)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.75)";
            }}
            onClick={() =>
              setContextMenu((prev) => ({ ...prev, visible: false }))
            }
          >
            Personalizar Mesa
          </button>
        </div>
      )}
    </div>
  );
}
