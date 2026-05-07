/**
 * Super Sprint F / MX248 — Tab Staff App Review.
 *
 * Acessível apenas para users com is_staff=true (verificado no JWT
 * via session.isStaff). Lista submissions pendentes e fornece UI de
 * checklist + aprovar / rejeitar / pedir mudanças via Edge Function
 * /app-review.
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";
import { ContentHeader, SectionLabel, Badge } from "./_shared";

interface SubmissionRow {
  id: string;
  developer_id: string;
  app_slug: string;
  version: string;
  name: string;
  description: string;
  long_description: string;
  icon: string;
  color: string;
  category: string;
  entry_mode: "iframe" | "weblink";
  entry_url: string;
  external_url: string | null;
  manifest_json: Record<string, unknown>;
  screenshots: string[];
  tags: string[];
  pricing_model: string;
  price_cents: number;
  license: string;
  status: string;
  submitted_at: string | null;
  rejection_reason: string | null;
}

interface DeveloperRow {
  id: string;
  display_name: string;
  email: string;
  website: string | null;
}

const CHECKLIST_ITEMS: Array<{ id: string; label: string }> = [
  { id: "https", label: "URL é HTTPS" },
  { id: "loads", label: "App carrega sem erros" },
  { id: "description", label: "Descrição é clara e precisa" },
  { id: "scopes", label: "Scopes solicitados são justificados" },
  { id: "content", label: "Não contém conteúdo ofensivo" },
  { id: "data", label: "Não coleta dados excessivos" },
  { id: "iframe_works", label: "Funciona em iframe (se entry_mode=iframe)" },
];

export function TabStaffAppReview(): React.ReactElement {
  const drivers = useDrivers();
  const isStaff = useSessionStore((s) => s.isStaff);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [devs, setDevs] = useState<Record<string, DeveloperRow>>({});
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selected, setSelected] = useState<SubmissionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (drivers === null || !isStaff) return;
    const d = drivers;
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      const { data: subs } = await d.data
        .from("app_submissions")
        .select("*")
        .order("submitted_at", { ascending: true });
      if (cancelled) return;
      const list = (subs ?? []) as SubmissionRow[];
      setRows(list);

      const developerIds = Array.from(new Set(list.map((s) => s.developer_id)));
      if (developerIds.length > 0) {
        const { data: devRows } = await d.data
          .from("developer_accounts")
          .select("id, display_name, email, website")
          .in("id", developerIds);
        const map: Record<string, DeveloperRow> = {};
        for (const row of (devRows ?? []) as DeveloperRow[]) map[row.id] = row;
        setDevs(map);
      }
      setLoading(false);
    }
    void load();

    const sub = d.data.subscribeToTable({
      table: "app_submissions",
      event: "*",
      onData: () => void load(),
    });
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [drivers, isStaff]);

  const visible = useMemo(() => {
    if (filter === "pending")
      return rows.filter((r) => ["submitted", "in_review"].includes(r.status));
    return rows;
  }, [rows, filter]);

  if (!isStaff) {
    return (
      <div>
        <ContentHeader
          icon={ShieldCheck}
          iconBg="rgba(167,139,250,0.18)"
          iconColor="#a78bfa"
          title="Revisão de apps"
          subtitle="Acesso restrito"
        />
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Esta tela é apenas para staff do Aethereos. Se você é staff, peça para
          definir
          <code> is_staff=true </code>
          no app_metadata da sua conta.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ContentHeader
        icon={ShieldCheck}
        iconBg="rgba(167,139,250,0.18)"
        iconColor="#a78bfa"
        title="Revisão de apps"
        subtitle="Aprove ou rejeite submissions de developers terceiros"
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              background:
                filter === f
                  ? "rgba(167,139,250,0.18)"
                  : "rgba(255,255,255,0.04)",
              border:
                filter === f
                  ? "1px solid rgba(167,139,250,0.40)"
                  : "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              color: filter === f ? "#a78bfa" : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {f === "pending" ? "Pendentes" : "Todas"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Carregando…
        </p>
      ) : visible.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Nenhuma submission no filtro atual.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((row) => {
            const dev = devs[row.developer_id];
            return (
              <article
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                }}
              >
                <Sparkles size={20} color={row.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.name}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      v{row.version} · {row.category}
                    </span>
                    <Badge
                      variant={
                        row.status === "submitted" ? "warning" : "neutral"
                      }
                    >
                      {row.status}
                    </Badge>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    {row.description}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 4,
                    }}
                  >
                    Por {dev?.display_name ?? "?"} · {dev?.email ?? "?"} ·{" "}
                    {row.submitted_at !== null
                      ? new Date(row.submitted_at).toLocaleString("pt-BR")
                      : "—"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  style={{
                    background: "#a78bfa",
                    border: "none",
                    borderRadius: 8,
                    color: "#0b1015",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 14px",
                    cursor: "pointer",
                  }}
                >
                  Revisar
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selected !== null && (
        <ReviewModal
          submission={selected}
          developer={devs[selected.developer_id]}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ReviewModal({
  submission,
  developer,
  onClose,
}: {
  submission: SubmissionRow;
  developer: DeveloperRow | undefined;
  onClose: () => void;
}): React.ReactElement {
  const drivers = useDrivers();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  async function call(
    action: "approve" | "reject" | "request_changes",
  ): Promise<void> {
    if (drivers === null || submitting) return;
    if (
      (action === "reject" || action === "request_changes") &&
      notes.trim().length < 5
    ) {
      setResult({ ok: false, message: "Informe um motivo (5+ caracteres)" });
      return;
    }
    setSubmitting(true);
    setResult(null);

    const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as
      | string
      | undefined;
    if (supabaseUrl === undefined) {
      setResult({ ok: false, message: "VITE_SUPABASE_URL não configurada" });
      setSubmitting(false);
      return;
    }
    const client = drivers.data.getClient();
    const {
      data: { session },
    } = await client.auth.getSession();
    const token = session?.access_token;
    if (token === undefined) {
      setResult({ ok: false, message: "Sessão expirada" });
      setSubmitting(false);
      return;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/app-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        submission_id: submission.id,
        action,
        notes,
        checklist,
      }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      error?: string;
      published?: boolean;
    };
    setSubmitting(false);
    if (!res.ok) {
      setResult({ ok: false, message: body.error ?? `HTTP ${res.status}` });
      return;
    }
    setResult({
      ok: true,
      message:
        action === "approve"
          ? `Aprovado e publicado na Magic Store.`
          : action === "reject"
            ? "Rejeitado. Developer foi notificado."
            : "Mudanças solicitadas. Submission voltou para draft.",
    });
    setTimeout(onClose, 1200);
  }

  const scopes =
    (submission.manifest_json as { scopes?: string[] }).scopes ?? [];

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Revisão de ${submission.name}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          width: "min(92vw, 720px)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Sparkles size={18} color={submission.color} />
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {submission.name} v{submission.version}
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "2px 0 0",
              }}
            >
              {developer?.display_name ?? "?"} · {developer?.email ?? "?"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <section>
            <SectionLabel>Resumo</SectionLabel>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              {submission.description}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "6px 0 0",
              }}
            >
              Categoria: {submission.category} · Modo: {submission.entry_mode} ·
              Pricing: {submission.pricing_model}
              {submission.pricing_model !== "free" &&
                ` (${(submission.price_cents / 100).toFixed(2)} BRL)`}
            </p>
            <a
              href={submission.entry_url}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 12,
                color: "#60a5fa",
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <ExternalLink size={12} />
              {submission.entry_url}
            </a>
          </section>

          <section>
            <SectionLabel>Scopes solicitados ({scopes.length})</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {scopes.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 11,
                    fontFamily: "ui-monospace, monospace",
                    color: "var(--text-secondary)",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    padding: "3px 8px",
                    borderRadius: 999,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Checklist</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.id] ?? false}
                    onChange={(e) =>
                      setChecklist((c) => ({
                        ...c,
                        [item.id]: e.target.checked,
                      }))
                    }
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Notas</SectionLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Comentários, motivos de rejeição ou pedidos de mudança…"
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.30)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                color: "var(--text-secondary)",
                fontSize: 12,
                padding: 10,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </section>

          {result !== null && (
            <div
              role="status"
              style={{
                fontSize: 12,
                color: result.ok ? "#34d399" : "#f87171",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {result.ok ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              {result.message}
            </div>
          )}
        </div>

        <footer
          style={{
            padding: "12px 18px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => void call("request_changes")}
            disabled={submitting}
            style={{
              background: "rgba(251,191,36,0.10)",
              border: "1px solid rgba(251,191,36,0.30)",
              borderRadius: 8,
              color: "#fbbf24",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 14px",
              cursor: submitting ? "default" : "pointer",
            }}
          >
            Pedir mudanças
          </button>
          <button
            type="button"
            onClick={() => void call("reject")}
            disabled={submitting}
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.30)",
              borderRadius: 8,
              color: "#f87171",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 14px",
              cursor: submitting ? "default" : "pointer",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <XCircle size={12} />
            Rejeitar
          </button>
          <button
            type="button"
            onClick={() => void call("approve")}
            disabled={submitting}
            style={{
              background: "#10b981",
              border: "none",
              borderRadius: 8,
              color: "#0b1015",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 14px",
              cursor: submitting ? "default" : "pointer",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <CheckCircle2 size={12} />
            Aprovar
          </button>
        </footer>
      </div>
    </div>
  );
}
