import { useEffect } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { useMesaStore, getWallpaperStyle } from "../../stores/mesaStore";
import { useOSStore } from "../../stores/osStore";
import { getApp } from "../registry";
import type { MesaItem } from "../../types/os";

function DesktopIcon({ item }: { item: MesaItem }) {
  const openApp = useOSStore((s) => s.openApp);
  const app = getApp(item.appId);

  if (!app) return null;

  const Icon =
    (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
      app.icon
    ] ?? LucideIcons.Box;

  return (
    <button
      onClick={() => openApp(app.id, app.name)}
      className="absolute flex flex-col items-center gap-1.5 p-2 cursor-pointer group"
      style={{
        left: item.position.x,
        top: item.position.y,
        width: item.size.w,
        borderRadius: "var(--radius-xl)",
        transition: "background var(--transition-fast)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Icon tile */}
      <div
        className="flex items-center justify-center transition-transform group-hover:scale-105"
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-lg)",
          background: `linear-gradient(145deg, ${app.color}28, ${app.color}12)`,
          border: `1px solid ${app.color}28`,
          boxShadow: `0 4px 16px ${app.color}15, inset 0 1px 0 rgba(255,255,255,0.10)`,
          transition: "transform var(--transition-spring)",
        }}
      >
        <Icon size={26} style={{ color: app.color }} strokeWidth={1.4} />
      </div>

      {/* Label */}
      <span
        className="text-center leading-tight max-w-full truncate px-1"
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)",
        }}
      >
        {app.name}
      </span>
    </button>
  );
}

export function MesaApp() {
  const { layout, wallpaper, fetchLayout } = useMesaStore();

  useEffect(() => {
    void fetchLayout();
  }, [fetchLayout]);

  const wallpaperStyle = getWallpaperStyle(wallpaper);
  const icons = layout.filter((item) => item.type === "icon");

  return (
    <div
      data-testid="mesa-app"
      className="h-full w-full relative overflow-hidden"
      style={wallpaperStyle}
    >
      {icons.map((item) => (
        <DesktopIcon key={item.id} item={item} />
      ))}
    </div>
  );
}
