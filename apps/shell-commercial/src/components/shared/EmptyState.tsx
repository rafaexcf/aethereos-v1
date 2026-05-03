import * as Icons from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

export interface EmptyStateProps {
  icon?: string;
  iconColor?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: CSSProperties;
}

type AnyIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

/**
 * Estado vazio canônico do OS.
 * Usado quando uma lista, feed ou grid não tem itens.
 * Inclui ícone, título, descrição opcional e CTA opcional.
 */
export function EmptyState({
  icon = "Inbox",
  iconColor = "var(--text-tertiary, rgba(255,255,255,0.40))",
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  const IconCmp =
    (Icons as unknown as Record<string, AnyIcon>)[icon] ?? Icons.Inbox;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--text-secondary, rgba(255,255,255,0.65))",
        ...style,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconCmp size={26} color={iconColor} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        {title}
      </div>
      {description !== undefined && (
        <div
          style={{ fontSize: 12, color: "var(--text-tertiary)", maxWidth: 320 }}
        >
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
