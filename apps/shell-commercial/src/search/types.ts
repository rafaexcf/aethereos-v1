// ─── Core result type ─────────────────────────────────────────────────────────

export interface SearchResult {
  /** Globally unique — e.g. "note-uuid", "task-uuid", "app-tarefas" */
  id: string;
  type:
    | "app"
    | "note"
    | "task"
    | "contact"
    | "file"
    | "poll"
    | "kanban"
    | "action";
  title: string;
  subtitle?: string;
  /** Lucide icon name or single emoji */
  icon: string;
  iconColor?: string;
  /** Badge text — e.g. priority label, date */
  badge?: string;
  badgeColor?: string;
  /** Called when user selects this result (Enter or click) */
  action: () => void;
}

// ─── Group ────────────────────────────────────────────────────────────────────

export interface SearchGroup {
  id: string;
  label: string;
  icon: string;
  results: SearchResult[];
}

// ─── Provider context (passed at query time) ──────────────────────────────────

export interface SearchContext {
  drivers: {
    data: {
      from: (table: string) => {
        select: (cols: string) => unknown;
      };
    };
  } | null;
  userId: string | null;
  companyId: string | null;
  openApp: (appId: string, title: string) => void;
  closeSearch: () => void;
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface SearchProvider {
  id: string;
  /** Display name shown as group header */
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Hard limit per query */
  maxResults: number;
  /** Return [] on any failure — never throw */
  search: (query: string, ctx: SearchContext) => Promise<SearchResult[]>;
}
