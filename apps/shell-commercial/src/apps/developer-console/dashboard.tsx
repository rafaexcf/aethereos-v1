/**
 * Super Sprint F / MX244 — Dashboard do developer.
 *
 * Cards: total apps, instalações totais, status (publicados / em revisão / drafts).
 * Lista de apps. Botão "Registrar novo app" e "Regenerar API key".
 * Seção API key mascarada com botão copiar.
 *
 * MX250 expande este componente com gráficos de instalações.
 */

import * as React from "react";
import { useMemo, useState } from "react";
import {
  Sparkles,
  Plus,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Box,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  XCircle,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useDeveloperApps, useInstallationsByDeveloper } from "./hooks";
import { Sandbox } from "./sandbox";
import type {
  AppSubmission,
  AppSubmissionStatus,
  DeveloperAccount,
} from "./types";

interface DashboardProps {
  account: DeveloperAccount;
  onCreateApp: () => void;
  onEditApp: (app: AppSubmission) => void;
  onAccountRefresh: () => void;
}

const STATUS_META: Record<
  AppSubmissionStatus,
  { label: string; color: string; bg: string; icon: typeof Box }
> = {
  draft: {
    label: "Rascunho",
    color: "var(--text-tertiary)",
    bg: "rgba(255,255,255,0.06)",
    icon: Box,
  },
  submitted: {
    label: "Submetido",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.15)",
    icon: Clock3,
  },
  in_review: {
    label: "Em revisão",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.15)",
    icon: Clock3,
  },
  approved: {
    label: "Aprovado",
    color: "#34d399",
    bg: "rgba(52,211,153,0.15)",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejeitado",
    color: "#f87171",
    bg: "rgba(239,68,68,0.15)",
    icon: XCircle,
  },
  published: {
    label: "Publicado",
    color: "#34d399",
    bg: "rgba(52,211,153,0.18)",
    icon: CheckCircle2,
  },
  removed: {
    label: "Removido",
    color: "var(--text-tertiary)",
    bg: "rgba(255,255,255,0.04)",
    icon: XCircle,
  },
};

function maskKey(key: string, visible: boolean): string {
  if (visible) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function DeveloperDashboard({
  account,
  onCreateApp,
  onEditApp,
  onAccountRefresh,
}: DashboardProps): React.ReactElement {
  const drivers = useDrivers();
  const { data: apps, loading: appsLoading } = useDeveloperApps(account.id);
  const slugs = useMemo(() => (apps ?? []).map((a) => a.app_slug), [apps]);
  const { byApp } = useInstallationsByDeveloper(slugs);

  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [sandboxApp, setSandboxApp] = useState<AppSubmission | null>(null);

  const counts = useMemo(() => {
    const list = apps ?? [];
    return {
      total: list.length,
      published: list.filter((a) => a.status === "published").length,
      review: list.filter((a) => ["submitted", "in_review"].includes(a.status))
        .length,
      drafts: list.filter((a) => a.status === "draft").length,
    };
  }, [apps]);

  const totalInstalls = useMemo(
    () => Object.values(byApp).reduce((acc, b) => acc + b.total, 0),
    [byApp],
  );

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(account.api_key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1500);
  }

  async function handleRegenerate(): Promise<void> {
    if (drivers === null) return;
    if (
      !confirm(
        "Regenerar API key? A key atual deixará de funcionar imediatamente. Apps que dependem dela precisarão ser atualizados.",
      )
    ) {
      return;
    }
    setRegenerating(true);
    setRegenError(null);
    // gen via SQL (não há helper Postgres no client; usa update com função do banco
    // — workaround: gerar no client com Web Crypto e enviar como string hex).
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    const hex = Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const { error: err } = await drivers.data
      .from("developer_accounts")
      .update({ api_key: hex })
      .eq("id", account.id);
    setRegenerating(false);
    if (err !== null && err !== undefined) {
      setRegenError(
        typeof err === "object" && "message" in err
          ? String(err.message)
          : "Falha",
      );
      return;
    }
    onAccountRefresh();
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "32px 28px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "rgba(167,139,250,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={20} color="#a78bfa" />
        </div>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Developer Console
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Olá, {account.display_name} — {account.email}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateApp}
          style={{
            background: "#a78bfa",
            border: "none",
            borderRadius: 10,
            color: "#0b1015",
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 16px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Plus size={14} />
          Registrar app
        </button>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <StatCard
          icon={Box}
          color="#a78bfa"
          label="Apps registrados"
          value={String(counts.total)}
          sublabel={`${counts.published} publicados`}
        />
        <StatCard
          icon={TrendingUp}
          color="#34d399"
          label="Instalações totais"
          value={String(totalInstalls)}
          sublabel="Ativas em todos apps"
        />
        <StatCard
          icon={Clock3}
          color="#60a5fa"
          label="Em revisão"
          value={String(counts.review)}
          sublabel="Submetidos para staff"
        />
        <StatCard
          icon={AlertTriangle}
          color="#fbbf24"
          label="Rascunhos"
          value={String(counts.drafts)}
          sublabel="Pendentes de submit"
        />
      </section>

      <section
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Sua API key
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginLeft: "auto",
            }}
          >
            Use no header X-Aethereos-Api-Key
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "rgba(0,0,0,0.30)",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <code
            style={{
              flex: 1,
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "ui-monospace, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {maskKey(account.api_key, showKey)}
          </code>
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? "Ocultar" : "Revelar"}
            title={showKey ? "Ocultar" : "Revelar"}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label="Copiar API key"
            title={keyCopied ? "Copiado" : "Copiar"}
            style={{
              background: "transparent",
              border: "none",
              color: keyCopied ? "#34d399" : "var(--text-tertiary)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <Copy size={14} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => void handleRegenerate()}
            disabled={regenerating}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "6px 12px",
              cursor: regenerating ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RefreshCw size={12} />
            {regenerating ? "Regenerando…" : "Regenerar key"}
          </button>
          {regenError !== null && (
            <span style={{ fontSize: 12, color: "#f87171" }}>{regenError}</span>
          )}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Seus apps
        </h2>

        {appsLoading ? (
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            Carregando…
          </p>
        ) : (apps ?? []).length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.10)",
              borderRadius: 12,
              fontSize: 13,
              color: "var(--text-tertiary)",
            }}
          >
            Você ainda não registrou nenhum app. Comece pelo botão acima.
          </div>
        ) : (
          (apps ?? []).map((app) => {
            const meta = STATUS_META[app.status];
            const Icon = meta.icon;
            const installs = byApp[app.app_slug];
            return (
              <article
                key={app.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: app.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: app.color, fontWeight: 700 }}
                  >
                    {app.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
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
                      {app.name}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      v{app.version}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: meta.color,
                        background: meta.bg,
                        padding: "2px 8px",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon size={10} />
                      {meta.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {app.description}
                  </div>
                  {installs !== undefined && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 4,
                      }}
                    >
                      {installs.total} instalações ativas · {installs.month}{" "}
                      este mês
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {app.entry_url.startsWith("https://") && (
                    <button
                      type="button"
                      onClick={() => setSandboxApp(app)}
                      style={{
                        background: "rgba(167,139,250,0.10)",
                        border: "1px solid rgba(167,139,250,0.30)",
                        borderRadius: 8,
                        color: "#a78bfa",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "6px 12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Testar
                    </button>
                  )}
                  {(app.status === "draft" || app.status === "rejected") && (
                    <SubmitButton app={app} />
                  )}
                  <button
                    type="button"
                    onClick={() => onEditApp(app)}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ExternalLink size={12} />
                    Abrir
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {sandboxApp !== null && (
        <Sandbox app={sandboxApp} onClose={() => setSandboxApp(null)} />
      )}
    </div>
  );
}

function SubmitButton({ app }: { app: AppSubmission }): React.ReactElement {
  const drivers = useDrivers();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(): Promise<void> {
    if (drivers === null || submitting) return;
    // Validation pre-submit (mirrors wizard validateAll, simplified)
    if (
      !app.entry_url.startsWith("https://") ||
      app.name.trim().length === 0 ||
      app.description.trim().length === 0 ||
      app.app_slug.trim().length === 0
    ) {
      setError("App incompleto — edite e preencha campos obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await drivers.data
      .from("app_submissions")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", app.id);
    setSubmitting(false);
    if (err !== null && err !== undefined) {
      setError(
        typeof err === "object" && "message" in err
          ? String(err.message)
          : "Falha",
      );
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
      }}
    >
      <button
        type="button"
        onClick={() => void handle()}
        disabled={submitting}
        style={{
          background: "#10b981",
          border: "none",
          borderRadius: 8,
          color: "#0b1015",
          fontSize: 12,
          fontWeight: 600,
          padding: "6px 12px",
          cursor: submitting ? "default" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {submitting ? "Submetendo…" : "Submeter"}
      </button>
      {error !== null && (
        <span style={{ fontSize: 10, color: "#f87171" }}>{error}</span>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  sublabel,
}: {
  icon: typeof Box;
  color: string;
  label: string;
  value: string;
  sublabel: string;
}): React.ReactElement {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={14} color={color} />
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        {sublabel}
      </div>
    </div>
  );
}
