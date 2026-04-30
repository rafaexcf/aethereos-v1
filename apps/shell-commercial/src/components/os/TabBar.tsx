import { X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
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
import { getApp } from "../../apps/registry";
import type { OSTab } from "../../types/os";

function AppIcon({
  iconName,
  color,
  size = 14,
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
  return <Icon size={size} style={{ color, opacity: active ? 1 : 0.5 }} />;
}

function SortableTab({ tab }: { tab: OSTab }) {
  const { focusTab, closeTab } = useOSStore();
  const app = getApp(tab.appId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isPinned = tab.isPinned;
  const isActive = tab.isActive;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => focusTab(tab.id)}
      data-testid={`tab-${tab.appId}`}
      className="relative flex items-center justify-center cursor-pointer select-none group flex-none transition-colors"
      style={{
        ...dragStyle,
        height: 32,
        padding: isPinned ? "0 10px" : "0 12px",
        gap: 6,
        borderRadius: "var(--radius-md)",
        maxWidth: isPinned ? 52 : 160,
        ...(isActive
          ? {
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-sm)",
            }
          : {
              background: "transparent",
              border: isPinned
                ? "1px solid var(--glass-border)"
                : "1px solid transparent",
            }),
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "var(--glass-bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {isPinned ? (
        <span
          className="text-[11px] font-medium leading-none"
          style={{
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
              size={14}
              active={isActive}
            />
          )}
          <span
            className="text-[12px] font-medium truncate"
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
              maxWidth: 120,
            }}
          >
            {tab.title}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            data-testid={`close-tab-${tab.appId}`}
            className="flex-none opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-tertiary)")
            }
          >
            <X size={13} />
          </button>
        </>
      )}
    </div>
  );
}

export function TabBar() {
  const { tabs, reorderTabs } = useOSStore();
  const hasOpenApps = tabs.some((t) => t.appId !== "mesa");

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

  if (!hasOpenApps) return null;

  return (
    <div
      data-testid="tabbar"
      className="flex items-center overflow-x-auto shrink-0"
      style={{
        height: 40,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 8px",
        gap: 4,
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
          <div className="flex items-center" style={{ gap: 4 }}>
            {tabs.map((tab) => (
              <SortableTab key={tab.id} tab={tab} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex-1" />
    </div>
  );
}
