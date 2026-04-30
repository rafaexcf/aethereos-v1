import type { ReactNode } from "react";

export interface AppShellProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  sidebarWidth?: number;
  statusBar?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  title,
  subtitle,
  actions,
  sidebar,
  sidebarWidth = 240,
  statusBar,
  children,
}: AppShellProps) {
  return (
    <div
      data-ae="app-shell"
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* App header */}
      {(title !== undefined || actions !== undefined) && (
        <div
          className="flex shrink-0 items-center justify-between px-5 py-2.5"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(6,9,18,0.6)",
            backdropFilter: "blur(var(--blur-ui))",
            WebkitBackdropFilter: "blur(var(--blur-ui))",
            minHeight: 44,
          }}
        >
          <div className="flex flex-col gap-0.5">
            {title !== undefined && (
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {title}
              </h2>
            )}
            {subtitle !== undefined && (
              <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions !== undefined && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}

      {/* Main: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {sidebar !== undefined && (
          <aside
            className="shrink-0 overflow-y-auto"
            style={{
              width: sidebarWidth,
              background: "rgba(6,9,18,0.45)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            {sidebar}
          </aside>
        )}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>

      {/* Status bar */}
      {statusBar !== undefined && (
        <div
          className="shrink-0 px-4 py-1"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "rgba(6,9,18,0.5)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {statusBar}
        </div>
      )}
    </div>
  );
}
