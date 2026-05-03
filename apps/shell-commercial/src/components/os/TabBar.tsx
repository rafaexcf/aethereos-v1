import { useEffect, useRef, useState } from "react";
import { X, SplitSquareHorizontal, Columns2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useOSStore } from "../../stores/osStore";
import { APP_REGISTRY, getApp } from "../../apps/registry";
import type { OSTab } from "../../types/os";

const CONTENT_BG = "#0f151b";

function AppIcon({
  iconName,
  color,
  size = 13,
  active = false,
}: {
  iconName: string;
  color: string;
  size?: number;
  active?: boolean;
}) {
  const Icon =
    (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
      iconName
    ] ?? LucideIcons.Box;
  return <Icon size={size} style={{ color, opacity: active ? 1 : 0.55 }} />;
}

interface TabContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

function TabContextMenu({
  state,
  onClose,
}: {
  state: TabContextMenuState;
  onClose: () => void;
}) {
  const tabs = useOSStore((s) => s.tabs);
  const splitTab = useOSStore((s) => s.splitTab);
  const unsplitTab = useOSStore((s) => s.unsplitTab);
  const tab = tabs.find((t) => t.id === state.tabId);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);

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

  if (!tab) return null;

  const isSplit = tab.splitAppId !== undefined;
  const splittable = APP_REGISTRY.filter(
    (a) => a.id !== tab.appId && a.id !== "mesa" && a.opensAsModal !== true,
  );

  const MENU_W = 220;
  const SUBMENU_W = 240;
  const x = Math.min(state.x, window.innerWidth - MENU_W - 8);
  const y = Math.min(state.y, window.innerHeight - 260);

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 9999,
        width: MENU_W,
        background: "rgba(8,12,22,0.96)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
        padding: 4,
      }}
    >
      {!isSplit && (
        <div
          onMouseEnter={() => setSubmenuOpen(true)}
          onMouseLeave={() => setSubmenuOpen(false)}
          style={{ position: "relative" }}
        >
          <button
            type="button"
            disabled={splittable.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "7px 10px",
              borderRadius: 7,
              background: submenuOpen
                ? "rgba(255,255,255,0.07)"
                : "transparent",
              border: "none",
              color:
                splittable.length === 0
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.82)",
              fontSize: 13,
              cursor: splittable.length === 0 ? "default" : "pointer",
              textAlign: "left",
            }}
          >
            <SplitSquareHorizontal
              size={14}
              strokeWidth={1.8}
              style={{ color: "rgba(255,255,255,0.50)", flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>Dividir com...</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              ›
            </span>
          </button>

          {submenuOpen && splittable.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: MENU_W - 4,
                width: SUBMENU_W,
                maxHeight: 360,
                overflowY: "auto",
                background: "rgba(8,12,22,0.96)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
                padding: 4,
              }}
            >
              {splittable.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    splitTab(tab.id, a.id, a.name);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 7,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.82)",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <AppIcon iconName={a.icon} color={a.color} size={14} active />
                  <span style={{ flex: 1 }}>{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isSplit && (
        <button
          type="button"
          onClick={() => {
            unsplitTab(tab.id, "split");
            onClose();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "7px 10px",
            borderRadius: 7,
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.82)",
            fontSize: 13,
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Columns2
            size={14}
            strokeWidth={1.8}
            style={{ color: "rgba(255,255,255,0.50)", flexShrink: 0 }}
          />
          <span style={{ flex: 1 }}>Remover divisão</span>
        </button>
      )}
    </div>,
    document.body,
  );
}

function SortableTab({
  tab,
  onContextMenu,
}: {
  tab: OSTab;
  onContextMenu: (e: React.MouseEvent, tabId: string) => void;
}) {
  const { focusTab, closeTab } = useOSStore();
  const app = getApp(tab.appId);
  const splitApp =
    tab.splitAppId !== undefined ? getApp(tab.splitAppId) : undefined;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const isPinned = tab.isPinned;
  const isActive = tab.isActive;
  const isSplit = tab.splitAppId !== undefined;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => focusTab(tab.id)}
      onContextMenu={(e) => onContextMenu(e, tab.id)}
      data-testid={`tab-${tab.appId}`}
      className="relative flex items-center justify-center cursor-pointer select-none group flex-none"
      style={{
        transform: CSS.Transform.toString(transform) || undefined,
        transition,
        opacity: isDragging ? 0.4 : 1,
        alignSelf: isActive ? "flex-end" : "center",
        height: isActive ? 35 : 27,
        padding: "0 10px",
        gap: 5,
        maxWidth: isPinned ? 56 : isSplit ? 200 : 160,
        zIndex: isActive ? 2 : 1,
        ...(isActive
          ? {
              borderRadius: "8px 8px 0 0",
              background: CONTENT_BG,
              borderTop: "1px solid rgba(255,255,255,0.10)",
              borderLeft: "1px solid rgba(255,255,255,0.10)",
              borderRight: "1px solid rgba(255,255,255,0.10)",
              borderBottom: `1px solid ${CONTENT_BG}`,
            }
          : {
              borderRadius: 7,
              background: "transparent",
              border: "1px solid transparent",
            }),
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      {isPinned ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
          }}
        >
          Mesa
        </span>
      ) : (
        <>
          {app !== undefined && (
            <AppIcon
              iconName={app.icon}
              color={app.color}
              size={13}
              active={isActive}
            />
          )}
          {isSplit && splitApp !== undefined && (
            <>
              <Columns2
                size={11}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", opacity: 0.7 }}
              />
              <AppIcon
                iconName={splitApp.icon}
                color={splitApp.color}
                size={13}
                active={isActive}
              />
            </>
          )}
          <span
            className="truncate"
            style={{
              fontSize: 12,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
              maxWidth: isSplit ? 130 : 110,
              letterSpacing: "-0.01em",
            }}
          >
            {isSplit && splitApp !== undefined
              ? `${tab.title} | ${tab.splitTitle ?? splitApp.name}`
              : tab.title}
          </span>
          {isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              data-testid={`close-tab-${tab.appId}`}
              className="flex-none ml-0.5 flex items-center justify-center"
              style={{
                width: 16,
                height: 16,
                borderRadius: "var(--radius-full)",
                color: "var(--text-tertiary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function TabBar() {
  const { tabs, reorderTabs } = useOSStore();
  const hasOpenApps = tabs.some((t) => t.appId !== "mesa");
  const [ctxMenu, setCtxMenu] = useState<TabContextMenuState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tabs.findIndex((t) => t.id === active.id);
    const newIndex = tabs.findIndex((t) => t.id === over.id);
    reorderTabs(oldIndex, newIndex);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  if (!hasOpenApps) return null;

  return (
    <div
      data-testid="tabbar"
      className="flex items-center overflow-x-auto shrink-0"
      style={{
        height: 40,
        background: "rgba(6,9,18,0.82)",
        backdropFilter: `blur(var(--blur-ui))`,
        WebkitBackdropFilter: `blur(var(--blur-ui))`,
        boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.10)",
        paddingLeft: 8,
        paddingRight: 8,
        paddingBottom: 0,
        gap: 2,
        scrollbarWidth: "none",
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex items-center" style={{ gap: 2, height: "100%" }}>
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex-1" />

      {ctxMenu !== null && (
        <TabContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)} />
      )}
    </div>
  );
}
