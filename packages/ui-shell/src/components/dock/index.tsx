export interface DockItem {
  id: string;
  label: string;
  icon: string;
  appId: string;
  isRunning?: boolean;
  badgeCount?: number;
}

export interface DockProps {
  items: DockItem[];
  position?: "bottom" | "left" | "right";
  onItemClick?: (item: DockItem) => void;
  onItemContextMenu?: (item: DockItem, event: MouseEvent) => void;
}

/**
 * Dock — barra de atalhos do shell Aethereos.
 * Placeholder: API definida, render mínimo.
 * Implementação real: @dnd-kit para reordenação (ADR-0014 convergências).
 * Animações: CSS transitions apenas (sem framer-motion).
 */
export function Dock({ items, position = "bottom", onItemClick }: DockProps) {
  const isVertical = position === "left" || position === "right";

  return (
    <nav
      data-ae="dock"
      data-position={position}
      className={[
        "flex gap-2 p-2 rounded-xl",
        "bg-[var(--ae-dock-bg)] backdrop-blur-md",
        "shadow-[var(--ae-shadow-dock)]",
        isVertical ? "flex-col" : "flex-row items-center",
      ].join(" ")}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          onClick={() => onItemClick?.(item)}
          className="relative w-12 h-12 flex items-center justify-center rounded-lg transition-transform hover:scale-110 active:scale-95"
        >
          <span className="text-2xl select-none">{item.icon}</span>
          {item.isRunning === true && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--ae-primary)]" />
          )}
          {item.badgeCount !== undefined && item.badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[var(--ae-destructive)] text-white text-xs flex items-center justify-center">
              {item.badgeCount > 99 ? "99+" : item.badgeCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
