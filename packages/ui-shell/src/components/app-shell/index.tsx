import type { ReactNode } from "react";

export interface AppShellProps {
  /** Título exibido no header interno do app */
  title?: string;
  /** Subtítulo ou breadcrumb */
  subtitle?: string;
  /** Botões de ação no header (canto direito) */
  actions?: ReactNode;
  /** Painel lateral esquerdo (árvore de navegação, filtros, etc.) */
  sidebar?: ReactNode;
  /** Largura do sidebar em pixels — padrão 240 */
  sidebarWidth?: number;
  /** Barra de status no rodapé */
  statusBar?: ReactNode;
  /** Conteúdo principal do app */
  children: ReactNode;
}

/**
 * AppShell — wrapper de layout para apps internos da Camada 1.
 * Compartilhado por Drive, Pessoas, Chat, Configurações, etc.
 * Desktop-first (Camada 1 é desktop-first por design).
 */
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
      className="flex h-full w-full flex-col overflow-hidden bg-zinc-950"
    >
      {/* Header interno do app */}
      {(title !== undefined || actions !== undefined) && (
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2">
          <div className="flex flex-col gap-0.5">
            {title !== undefined && (
              <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
            )}
            {subtitle !== undefined && (
              <p className="text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>
          {actions !== undefined && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}

      {/* Área principal: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {sidebar !== undefined && (
          <aside
            className="shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </aside>
        )}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>

      {/* Status bar */}
      {statusBar !== undefined && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-1 text-xs text-zinc-500">
          {statusBar}
        </div>
      )}
    </div>
  );
}
