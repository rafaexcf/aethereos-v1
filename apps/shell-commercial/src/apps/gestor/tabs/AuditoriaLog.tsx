// Sprint 26: tab "Log de Acoes" do Gestor.
// Le os ultimos 50 registros de kernel.audit_log via driver browser; permite
// busca local por action ou actor, sem chamadas de rede adicionais.

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";
import {
  Badge,
  ComingSoonSection,
  ContentHeader,
  SettingGroup,
  SettingRow,
} from "./_shared";

interface AuditLogRow {
  id: number;
  actor_id: string;
  actor_type: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  payload: unknown;
  created_at: string;
}

type Severity = "low" | "medium" | "high" | "critical";

type BadgeVariant = "success" | "warning" | "neutral" | "danger" | "info";

function severityFromAction(action: string): Severity {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("revoke") || a.includes("block")) {
    return "critical";
  }
  if (
    a.includes("update") ||
    a.includes("change") ||
    a.includes("permission")
  ) {
    return "high";
  }
  if (a.includes("create") || a.includes("invite") || a.includes("grant")) {
    return "medium";
  }
  return "low";
}

const SEVERITY_VARIANT: Record<Severity, BadgeVariant> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Info",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TabAuditoriaLog() {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const activeCompanyId = useSessionStore((s) => s.activeCompanyId);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (drivers === null || userId === null || activeCompanyId === null) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = (await drivers.data
          .from("audit_log")
          .select(
            "id,actor_id,actor_type,action,resource_type,resource_id,payload,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(50)) as unknown as {
          data: AuditLogRow[] | null;
          error: { message: string } | null;
        };
        if (cancelled) return;
        if (res.error !== null) {
          setError(res.error.message);
          setRows([]);
        } else {
          setRows(res.data ?? []);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [drivers, userId, activeCompanyId]);

  const filtered = useMemo<AuditLogRow[]>(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return rows;
    return rows.filter((r) => {
      return (
        r.action.toLowerCase().includes(q) ||
        r.actor_id.toLowerCase().includes(q) ||
        r.actor_type.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const showEmpty = !loading && error === null && filtered.length === 0;

  return (
    <div>
      <ContentHeader
        icon={ClipboardList}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Log de Acoes"
        subtitle="Trilha completa de acoes administrativas"
      />

      <div
        style={{
          position: "relative",
          marginBottom: 16,
        }}
      >
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-tertiary)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar por acao ou ator"
          placeholder="Buscar por acao ou ator..."
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            padding: "8px 12px 8px 32px",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>

      {loading && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Carregando...
        </div>
      )}

      {error !== null && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.32)",
            color: "#fca5a5",
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          Falha ao carregar o log: {error}
        </div>
      )}

      {showEmpty && (
        <ComingSoonSection
          icon={ClipboardList}
          label="Nenhum registro encontrado"
          description={
            query.trim() === ""
              ? "Ainda nao ha acoes auditadas para esta empresa."
              : "Nenhum registro corresponde a busca atual."
          }
        />
      )}

      {!loading && error === null && filtered.length > 0 && (
        <SettingGroup>
          {filtered.map((row, idx) => {
            const severity = severityFromAction(row.action);
            return (
              <SettingRow
                key={row.id}
                label={row.action}
                sublabel={`${row.actor_type} ${row.actor_id.slice(0, 8)} - ${formatTimestamp(row.created_at)}`}
                last={idx === filtered.length - 1}
              >
                <Badge variant={SEVERITY_VARIANT[severity]}>
                  {SEVERITY_LABEL[severity]}
                </Badge>
              </SettingRow>
            );
          })}
        </SettingGroup>
      )}
    </div>
  );
}
