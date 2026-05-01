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

// Deve ser idêntica ao background do AppFrame para o efeito de junção funcionar
const CONTENT_BG = "#0f151b";
// Tamanho do raio côncavo nos cantos inferiores da aba ativa (estilo Chrome)
const CORNER_R = 10;

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

  const isPinned = tab.isPinned;
  const isActive = tab.isActive;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => focusTab(tab.id)}
      data-testid={`tab-${tab.appId}`}
      className="relative flex items-center justify-center cursor-pointer select-none group flex-none"
      style={{
        transform:
          [
            CSS.Transform.toString(transform),
            isActive ? "translateY(1px)" : undefined,
          ]
            .filter(Boolean)
            .join(" ") || undefined,
        transition,
        opacity: isDragging ? 0.4 : 1,
        alignSelf: isActive ? "flex-end" : "center",
        height: isActive ? 35 : 27,
        padding: "0 10px",
        gap: 5,
        maxWidth: isPinned ? 56 : 160,
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
      {/* ── Cantos côncavos estilo Chrome ── */}
      {isActive && (
        <>
          {/* Canto inferior-esquerdo */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: -CORNER_R,
              width: CORNER_R,
              height: CORNER_R,
              // Centro no canto superior-direito do span → cria curva côncava para baixo-esquerda
              background: `radial-gradient(circle at 100% 100%, transparent ${CORNER_R - 1}px, ${CONTENT_BG} ${CORNER_R - 1}px)`,
              pointerEvents: "none",
            }}
          />
          {/* Canto inferior-direito */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              right: -CORNER_R,
              width: CORNER_R,
              height: CORNER_R,
              // Centro no canto superior-esquerdo do span → espelho
              background: `radial-gradient(circle at 0% 100%, transparent ${CORNER_R - 1}px, ${CONTENT_BG} ${CORNER_R - 1}px)`,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* ── Conteúdo da aba ── */}
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
          <span
            className="truncate"
            style={{
              fontSize: 12,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
              maxWidth: 110,
              letterSpacing: "-0.01em",
            }}
          >
            {tab.title}
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
        background: "rgba(6,9,18,0.82)",
        backdropFilter: `blur(var(--blur-ui))`,
        WebkitBackdropFilter: `blur(var(--blur-ui))`,
        borderBottom: "1px solid var(--border-default)",
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
              <SortableTab key={tab.id} tab={tab} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex-1" />
    </div>
  );
}
