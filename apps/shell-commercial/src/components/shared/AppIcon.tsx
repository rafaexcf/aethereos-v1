/**
 * <AppIcon> — squircle Apple-style centralizado.
 *
 * Renderiza o ícone Lucide do app dentro de uma caixa squircle com
 * gradient vertical (top mais claro → base → bottom mais escuro), gloss
 * sutil no topo, drop shadow externa e highlights internos. Usa
 * `app.icon` (nome Lucide) e `app.color` (hex) do registry.
 *
 * variant:
 *  - "default": Apple-like (gradient sólido + gloss + sombra). Para
 *    Magic Store, Launcher, Mesa, Dock.
 *  - "glass":  versão translúcida (sem gradiente sólido) para fundos
 *    escuros onde queremos só uma "pílula". Mantém compatibilidade
 *    com cards mais discretos.
 */

import * as React from "react";
import * as LucideIcons from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Mistura o hex com branco (percent>0) ou preto (percent<0).
 * percent em [-100, 100]. Retorna rgb() string. Exportado para reuso
 * (Dock anima motion.div com gradient inline e precisa do helper).
 */
export function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16,
  );
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const target = percent > 0 ? 255 : 0;
  const t = clamp(Math.abs(percent), 0, 100) / 100;
  const adj = (c: number): number => Math.round(c + (target - c) * t);
  return `rgb(${adj(r)}, ${adj(g)}, ${adj(b)})`;
}

export interface AppIconProps {
  iconName: string;
  color: string;
  /** Lado do quadrado em px. Default 56. */
  size?: number;
  /** Override do raio. Default = 22.37% (proporção squircle Apple). */
  radius?: number;
  /** Cor do glyph. Default branco. */
  glyphColor?: string;
  variant?: "default" | "glass";
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export function AppIcon({
  iconName,
  color,
  size = 56,
  radius,
  glyphColor = "#ffffff",
  variant = "default",
  className,
  style,
  ariaLabel,
}: AppIconProps): React.ReactElement {
  const Icon =
    (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
      iconName
    ] ?? LucideIcons.Box;
  const r = radius ?? Math.round(size * 0.2237);
  const glyphSize = Math.max(10, Math.round(size * 0.52));
  const isGlass = variant === "glass";
  const lightTop = shadeColor(color, 22);
  const darkBottom = shadeColor(color, -18);

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: r,
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isGlass
      ? `linear-gradient(140deg, ${color}38, ${color}14)`
      : `linear-gradient(180deg, ${lightTop} 0%, ${color} 55%, ${darkBottom} 100%)`,
    boxShadow: isGlass
      ? `inset 0 1px 0 rgba(255,255,255,0.10), 0 ${Math.max(2, size * 0.04)}px ${Math.max(8, size * 0.12)}px rgba(0,0,0,0.22)`
      : `inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(0,0,0,0.18), 0 ${Math.max(2, size * 0.04)}px ${Math.max(10, size * 0.14)}px rgba(0,0,0,0.32)`,
    border: isGlass ? `1px solid ${color}40` : "none",
    ...(style ?? {}),
  };

  return (
    <div
      className={className}
      style={baseStyle}
      role={ariaLabel !== undefined ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {!isGlass && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "48%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
            borderTopLeftRadius: r,
            borderTopRightRadius: r,
          }}
        />
      )}
      <Icon
        size={glyphSize}
        strokeWidth={1.6}
        absoluteStrokeWidth
        style={{
          color: isGlass ? color : glyphColor,
          position: "relative",
          filter: isGlass ? "none" : `drop-shadow(0 1px 1px rgba(0,0,0,0.20))`,
        }}
      />
    </div>
  );
}
