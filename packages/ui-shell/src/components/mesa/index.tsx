import type { ReactNode } from "react";

export interface MesaWidget {
  id: string;
  title?: string;
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
  content?: ReactNode;
}

export interface MesaProps {
  widgets: MesaWidget[];
  columns?: number;
  gap?: number;
  onWidgetMove?: (widgetId: string, col: number, row: number) => void;
  onWidgetResize?: (widgetId: string, colSpan: number, rowSpan: number) => void;
}

/**
 * Mesa — grid de widgets do shell Aethereos.
 * Análogo ao home screen de um OS — permite organizar widgets em grid.
 * Placeholder: API definida, render mínimo.
 * Implementação real: react-grid-layout (ADR-0014 convergências).
 */
export function Mesa({ widgets, columns = 12 }: MesaProps) {
  return (
    <div
      data-ae="mesa"
      className="w-full h-full p-4"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "0.5rem",
      }}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          data-widget-id={widget.id}
          className="rounded-xl bg-[var(--ae-window-chrome)] shadow-[var(--ae-shadow-window)] p-3"
          style={{
            gridColumn: `${widget.col} / span ${widget.colSpan ?? 1}`,
            gridRow: `${widget.row} / span ${widget.rowSpan ?? 1}`,
          }}
        >
          {widget.title !== undefined && (
            <p className="text-xs font-medium text-[var(--ae-muted-fg)] mb-2">
              {widget.title}
            </p>
          )}
          {widget.content}
        </div>
      ))}
    </div>
  );
}
