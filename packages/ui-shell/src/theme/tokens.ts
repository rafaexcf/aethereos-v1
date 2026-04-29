/**
 * Design tokens canônicos do Aethereos shell.
 * Usado por distribuições para customização via CSS variables em runtime.
 * Ref: ADR-0014 convergências (Tailwind v4 + shadcn/ui)
 */

export const SHELL_TOKENS = {
  colors: {
    background: "var(--ae-bg)",
    foreground: "var(--ae-fg)",
    primary: "var(--ae-primary)",
    primaryForeground: "var(--ae-primary-fg)",
    secondary: "var(--ae-secondary)",
    secondaryForeground: "var(--ae-secondary-fg)",
    muted: "var(--ae-muted)",
    mutedForeground: "var(--ae-muted-fg)",
    accent: "var(--ae-accent)",
    accentForeground: "var(--ae-accent-fg)",
    destructive: "var(--ae-destructive)",
    border: "var(--ae-border)",
    ring: "var(--ae-ring)",
    // Shell-specific
    dock: "var(--ae-dock-bg)",
    dockForeground: "var(--ae-dock-fg)",
    windowChrome: "var(--ae-window-chrome)",
    taskbar: "var(--ae-taskbar-bg)",
  },
  radii: {
    sm: "var(--ae-radius-sm, 4px)",
    md: "var(--ae-radius-md, 8px)",
    lg: "var(--ae-radius-lg, 12px)",
    window: "var(--ae-radius-window, 12px)",
  },
  shadows: {
    window: "var(--ae-shadow-window)",
    popup: "var(--ae-shadow-popup)",
    dock: "var(--ae-shadow-dock)",
  },
  zIndex: {
    desktop: 0,
    windows: 100,
    dock: 200,
    popups: 300,
    modals: 400,
    notifications: 500,
  },
} as const;

export type ShellTokens = typeof SHELL_TOKENS;

/** CSS variables padrão (tema base, sobrescritos por distribuições) */
export const DEFAULT_CSS_VARIABLES = `
  :root {
    --ae-bg: oklch(0.98 0 0);
    --ae-fg: oklch(0.09 0 0);
    --ae-primary: oklch(0.21 0.006 285.75);
    --ae-primary-fg: oklch(0.98 0 0);
    --ae-secondary: oklch(0.96 0.001 286.375);
    --ae-secondary-fg: oklch(0.21 0.006 285.75);
    --ae-muted: oklch(0.96 0.001 286.375);
    --ae-muted-fg: oklch(0.44 0.013 285.823);
    --ae-accent: oklch(0.96 0.001 286.375);
    --ae-accent-fg: oklch(0.21 0.006 285.75);
    --ae-destructive: oklch(0.62 0.214 22.7);
    --ae-border: oklch(0.92 0.004 286.32);
    --ae-ring: oklch(0.21 0.006 285.75);
    --ae-dock-bg: oklch(0.98 0 0 / 0.8);
    --ae-dock-fg: oklch(0.09 0 0);
    --ae-window-chrome: oklch(0.98 0 0 / 0.95);
    --ae-taskbar-bg: oklch(0.15 0.006 285);
    --ae-radius-sm: 4px;
    --ae-radius-md: 8px;
    --ae-radius-lg: 12px;
    --ae-radius-window: 12px;
    --ae-shadow-window: 0 8px 32px oklch(0 0 0 / 0.2);
    --ae-shadow-popup: 0 4px 16px oklch(0 0 0 / 0.15);
    --ae-shadow-dock: 0 2px 16px oklch(0 0 0 / 0.12);
  }

  .dark {
    --ae-bg: oklch(0.09 0 0);
    --ae-fg: oklch(0.98 0 0);
    --ae-primary: oklch(0.92 0.004 286.32);
    --ae-primary-fg: oklch(0.21 0.006 285.75);
    --ae-secondary: oklch(0.17 0.005 285.938);
    --ae-secondary-fg: oklch(0.92 0.004 286.32);
    --ae-muted: oklch(0.17 0.005 285.938);
    --ae-muted-fg: oklch(0.62 0.01 285.938);
    --ae-accent: oklch(0.17 0.005 285.938);
    --ae-accent-fg: oklch(0.92 0.004 286.32);
    --ae-destructive: oklch(0.62 0.214 22.7);
    --ae-border: oklch(0.17 0.005 285.938);
    --ae-ring: oklch(0.44 0.013 285.823);
    --ae-dock-bg: oklch(0.12 0.005 285 / 0.9);
    --ae-window-chrome: oklch(0.15 0.005 285 / 0.98);
    --ae-taskbar-bg: oklch(0.07 0.005 285);
  }
`;
