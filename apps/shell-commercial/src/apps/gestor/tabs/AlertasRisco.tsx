// Sprint 30 MX166: Alertas de Risco — feed de eventos de segurança auto-
// emitidos pela aplicação (member_removed, mfa_disabled, admin_added, ...).
// Lê os 100 mais recentes de kernel.security_alerts. Permite reconhecer
// individual ou em massa. Filtros client-side por severity/acknowledged.

import { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import {
  Badge,
  ContentHeader,
  InlineButton,
  SectionLabel,
  SettingGroup,
  SettingRow,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

type Severity = "info" | "warning" | "critical";

type SeverityFilter = Severity | "all";
type AckFilter = "all" | "open" | "ack";

interface AlertRow {
  id: string;
  alert_type: string;
  severity: Severity;
  title: string;
  description: string;
  metadata: Record<string, unknown> | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  user_id: string | null;
  created_at: string;
}

interface RawAlertRow {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  metadata: Record<string, unknown> | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  user_id: string | null;
  created_at: string;
}

function isSeverity(v: string): v is Severity {
  return v === "info" || v === "warning" || v === "critical";
}

const SEVERITY_VARIANT: Record<Severity, "info" | "warning" | "danger"> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Informativo",
  warning: "Aviso",
  critical: "Crítico",
};

function severityIcon(s: Severity) {
  if (s === "critical") {
    return <AlertOctagon size={16} style={{ color: "#f87171" }} />;
  }
  if (s === "warning") {
    return <AlertTriangle size={16} style={{ color: "#fbbf24" }} />;
  }
  return <Info size={16} style={{ color: "#67e8f9" }} />;
}

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "agora mesmo";
    const min = Math.floor(sec / 60);
    if (min < 60) return `há ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `há ${hr} h`;
    const d = Math.floor(hr / 24);
    if (d < 30) return `há ${d} dia${d > 1 ? "s" : ""}`;
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TabAlertasRisco() {
  const drivers = useDrivers();
  const activeCompanyId = useSessionStore((s) => s.activeCompanyId);
  const userId = useSessionStore((s) => s.userId);

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [ackFilter, setAckFilter] = useState<AckFilter>("all");
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load(): Promise<void> {
    if (drivers === null || activeCompanyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await drivers.data
        .from("security_alerts")
        .select(
          "id,alert_type,severity,title,description,metadata,acknowledged,acknowledged_by,user_id,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100)) as unknown as {
        data: RawAlertRow[] | null;
        error: { message: string } | null;
      };
      if (res.error !== null) {
        setError(res.error.message);
        setRows([]);
        return;
      }
      const mapped: AlertRow[] = (res.data ?? []).map((r) => ({
        id: r.id,
        alert_type: r.alert_type,
        severity: isSeverity(r.severity) ? r.severity : "info",
        title: r.title,
        description: r.description,
        metadata: r.metadata,
        acknowledged: r.acknowledged,
        acknowledged_by: r.acknowledged_by,
        user_id: r.user_id,
        created_at: r.created_at,
      }));
      setRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // load é estável o bastante (depende de drivers/companyId via closure).
  }, [drivers, activeCompanyId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (severityFilter !== "all" && r.severity !== severityFilter)
        return false;
      if (ackFilter === "open" && r.acknowledged) return false;
      if (ackFilter === "ack" && !r.acknowledged) return false;
      return true;
    });
  }, [rows, severityFilter, ackFilter]);

  const counts = useMemo(() => {
    let open = 0;
    let critical = 0;
    for (const r of rows) {
      if (!r.acknowledged) open++;
      if (r.severity === "critical" && !r.acknowledged) critical++;
    }
    return { open, critical, total: rows.length };
  }, [rows]);

  async function acknowledge(id: string): Promise<void> {
    if (drivers === null || userId === null) return;
    // Update otimista.
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, acknowledged: true, acknowledged_by: userId } : r,
      ),
    );
    try {
      const res = (await drivers.data
        .from("security_alerts")
        .update({ acknowledged: true, acknowledged_by: userId })
        .eq("id", id)) as unknown as { error: { message: string } | null };
      if (res.error !== null) {
        // Reverte.
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, acknowledged: false, acknowledged_by: null }
              : r,
          ),
        );
      }
    } catch {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, acknowledged: false, acknowledged_by: null }
            : r,
        ),
      );
    }
  }

  async function acknowledgeAll(): Promise<void> {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    if (counts.open === 0) return;
    if (
      !window.confirm(
        `Reconhecer ${counts.open} alerta(s) abertos? A ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    try {
      const res = (await drivers.data
        .from("security_alerts")
        .update({ acknowledged: true, acknowledged_by: userId })
        .eq("company_id", activeCompanyId)
        .eq("acknowledged", false)) as unknown as {
        error: { message: string } | null;
      };
      if (res.error === null) {
        setRows((prev) =>
          prev.map((r) =>
            r.acknowledged
              ? r
              : { ...r, acknowledged: true, acknowledged_by: userId },
          ),
        );
      }
    } finally {
      setBulkBusy(false);
    }
  }

  const subtitle =
    counts.total === 0
      ? "Nenhum alerta registrado"
      : `${counts.open} aberto(s) · ${counts.critical} crítico(s) · ${counts.total} total`;

  return (
    <div>
      <ContentHeader
        icon={ShieldAlert}
        iconBg="rgba(239,68,68,0.14)"
        iconColor="#fca5a5"
        title="Alertas de Risco"
        subtitle={subtitle}
        right={
          counts.open > 0 ? (
            <InlineButton
              variant="primary"
              onClick={() => {
                if (!bulkBusy) void acknowledgeAll();
              }}
            >
              <CheckCircle2 size={13} strokeWidth={2} />
              {bulkBusy ? "Reconhecendo…" : "Reconhecer todos"}
            </InlineButton>
          ) : null
        }
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <FilterChip
          active={severityFilter === "all"}
          onClick={() => setSeverityFilter("all")}
          label="Todas severidades"
        />
        <FilterChip
          active={severityFilter === "critical"}
          onClick={() => setSeverityFilter("critical")}
          label="Crítico"
          color="#f87171"
        />
        <FilterChip
          active={severityFilter === "warning"}
          onClick={() => setSeverityFilter("warning")}
          label="Aviso"
          color="#fbbf24"
        />
        <FilterChip
          active={severityFilter === "info"}
          onClick={() => setSeverityFilter("info")}
          label="Informativo"
          color="#67e8f9"
        />
        <span style={{ width: 1, background: "rgba(255,255,255,0.10)" }} />
        <FilterChip
          active={ackFilter === "all"}
          onClick={() => setAckFilter("all")}
          label="Todos"
        />
        <FilterChip
          active={ackFilter === "open"}
          onClick={() => setAckFilter("open")}
          label="Abertos"
        />
        <FilterChip
          active={ackFilter === "ack"}
          onClick={() => setAckFilter("ack")}
          label="Reconhecidos"
        />
      </div>

      <SectionLabel>Eventos recentes</SectionLabel>
      <SettingGroup>
        {loading ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-tertiary)",
            }}
          >
            Carregando…
          </div>
        ) : error !== null ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              fontSize: 13,
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-tertiary)",
            }}
          >
            {rows.length === 0
              ? "Nenhum alerta registrado ainda."
              : "Nenhum alerta corresponde aos filtros."}
          </div>
        ) : (
          filtered.map((r, i) => (
            <SettingRow
              key={r.id}
              last={i === filtered.length - 1}
              label={r.title}
              sublabel={`${r.description} · ${relativeTime(r.created_at)}`}
              icon={severityIcon(r.severity)}
            >
              <Badge variant={SEVERITY_VARIANT[r.severity]}>
                {SEVERITY_LABEL[r.severity]}
              </Badge>
              {r.acknowledged ? (
                <Badge variant="success">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ShieldCheck size={11} strokeWidth={2} />
                    Reconhecido
                  </span>
                </Badge>
              ) : (
                <InlineButton onClick={() => void acknowledge(r.id)}>
                  Reconhecer
                </InlineButton>
              )}
            </SettingRow>
          ))
        )}
      </SettingGroup>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.04)",
        border: active
          ? "1px solid rgba(99,102,241,0.50)"
          : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "5px 12px",
        fontSize: 12,
        fontWeight: 500,
        color: active ? "#c7d2fe" : (color ?? "var(--text-secondary)"),
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
    </button>
  );
}
