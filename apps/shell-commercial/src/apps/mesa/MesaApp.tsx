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
      className="absolute flex flex-col items-center gap-1 p-2 rounded-xl transition-colors cursor-pointer group"
      style={{
        left: item.position.x,
        top: item.position.y,
        width: item.size.w,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: 44,
          height: 44,
          background: `${app.color}20`,
          border: `1px solid ${app.color}30`,
        }}
      >
        <Icon size={22} style={{ color: app.color }} strokeWidth={1.5} />
      </div>
      <span
        className="text-[11px] font-medium text-center leading-tight max-w-full truncate px-1"
        style={{
          color: "var(--text-primary)",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
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
