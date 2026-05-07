// Sprint 26: primitives compartilhadas dos tabs do Gestor.
// Espelham gestor/index.tsx (mantém visual consistente entre tabs antigas e
// novas). Edicoes aqui devem ser propagadas pra index.tsx em pareamento.

import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";

export const TILE_BASE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

export function TileIcon({
  Icon,
  color,
  bg,
  size = 30,
}: {
  Icon: ComponentType<LucideProps>;
  color: string;
  bg: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={size * 0.5} style={{ color }} strokeWidth={1.7} />
    </div>
  );
}

export function ContentHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  right,
}: {
  icon: ComponentType<LucideProps>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginBottom: 28,
        paddingBottom: 24,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: iconBg,
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={28} style={{ color: iconColor }} strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            fontFamily: "var(--font-display)",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      </div>
      {right !== undefined && right !== null && (
        <div style={{ flexShrink: 0 }}>{right}</div>
      )}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}

export function SettingGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SettingRow({
  label,
  sublabel,
  last,
  icon,
  children,
}: {
  label: string;
  sublabel?: string;
  last?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "11px 16px",
        gap: 12,
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon !== undefined && icon}
          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
            {label}
          </span>
        </div>
        {sublabel !== undefined && (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {sublabel}
          </span>
        )}
      </div>
      {children !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: on ? "#63f27e" : "rgba(255,255,255,0.15)",
        transition: "background 200ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: 0,
          display: "block",
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#ffffff",
          transition: "transform 200ms ease",
          transform: on ? "translateX(22px)" : "translateX(2px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        }}
      />
    </button>
  );
}

export function Badge({
  variant,
  children,
}: {
  variant: "success" | "warning" | "neutral" | "danger" | "info";
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    success: { background: "rgba(16,185,129,0.14)", color: "#34d399" },
    warning: { background: "rgba(245,158,11,0.14)", color: "#fbbf24" },
    neutral: {
      background: "rgba(255,255,255,0.06)",
      color: "var(--text-tertiary)",
    },
    danger: { background: "rgba(239,68,68,0.12)", color: "#f87171" },
    info: { background: "rgba(99,102,241,0.14)", color: "#a5b4fc" },
  };
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 500,
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}

export function InlineButton({
  onClick,
  children,
  variant = "default",
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "primary" | "danger";
}) {
  const variants = {
    default: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      color: "var(--text-primary)",
      hoverBg: "rgba(255,255,255,0.11)",
    },
    primary: {
      background: "rgba(99,102,241,0.85)",
      border: "1px solid rgba(99,102,241,1)",
      color: "#fff",
      hoverBg: "#6366f1",
    },
    danger: {
      background: "rgba(239,68,68,0.10)",
      border: "1px solid rgba(239,68,68,0.32)",
      color: "#fca5a5",
      hoverBg: "rgba(239,68,68,0.18)",
    },
  };
  const v = variants[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: v.background,
        border: v.border,
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 500,
        color: v.color,
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = v.hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = v.background;
      }}
    >
      {children}
    </button>
  );
}

export function ComingSoonSection({
  icon: Icon,
  label,
  description,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  description?: string;
}) {
  return (
    <div
      style={{
        padding: "48px 24px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.025)",
        border: "1px dashed rgba(255,255,255,0.10)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon size={20} strokeWidth={1.6} style={{ color: "#a5b4fc" }} />
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          lineHeight: 1.5,
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        {description ?? "Disponível em uma próxima sprint."}
      </div>
    </div>
  );
}
