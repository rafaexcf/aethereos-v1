export interface TabItem {
  id: string;
  label: string;
  appId: string;
  windowId?: string;
  isActive?: boolean;
  isPinned?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId?: string;
  onTabClick?: (tab: TabItem) => void;
  onTabClose?: (tab: TabItem) => void;
}

/**
 * Tabs — barra de abas para janelas/apps do shell Aethereos.
 * Placeholder: API definida, render mínimo.
 */
export function Tabs({ tabs, activeTabId, onTabClick, onTabClose }: TabsProps) {
  return (
    <div
      data-ae="tabs"
      className="flex flex-row items-end gap-1 overflow-x-auto px-2"
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          data-active={tab.id === activeTabId}
          className={[
            "flex items-center gap-2 px-3 py-1.5 rounded-t-lg transition-colors",
            "text-sm font-medium max-w-48 min-w-20 truncate",
            tab.id === activeTabId
              ? "bg-[var(--ae-bg)] text-[var(--ae-fg)]"
              : "bg-[var(--ae-muted)] text-[var(--ae-muted-fg)] hover:bg-[var(--ae-secondary)]",
          ].join(" ")}
        >
          <button
            type="button"
            className="flex-1 text-left truncate"
            onClick={() => onTabClick?.(tab)}
          >
            {tab.label}
          </button>
          {tab.isPinned !== true && (
            <button
              type="button"
              aria-label={`Fechar ${tab.label}`}
              onClick={() => onTabClose?.(tab)}
              className="w-4 h-4 rounded hover:bg-[var(--ae-destructive)] hover:text-white flex items-center justify-center text-xs"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
