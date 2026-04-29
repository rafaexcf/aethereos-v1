import type { ReactNode } from "react";

export interface DesktopProps {
  children?: ReactNode;
  wallpaper?: string;
  className?: string;
}

/**
 * Desktop — área de trabalho do shell Aethereos.
 * Container raiz onde janelas e widgets são renderizados.
 * Placeholder: API definida, render mínimo.
 */
export function Desktop({ children, wallpaper, className }: DesktopProps) {
  return (
    <div
      data-ae="desktop"
      className={["relative flex-1 overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        background:
          wallpaper !== undefined
            ? `url(${wallpaper}) center/cover no-repeat`
            : "var(--ae-bg)",
      }}
    >
      {children}
    </div>
  );
}
