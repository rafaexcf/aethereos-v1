/**
 * Super Sprint E / MX238 — Histórico de Pagamentos com dados reais.
 *
 * Lê kernel.invoices via driver (RLS por company_id). Mostra status,
 * período, valor formatado em BRL, links para PDF se existirem.
 *
 * MX241: NF-e (Opção D — texto direcionando para contato).
 */

import * as React from "react";
import { useEffect, useState } from "react";
import { FileText, ExternalLink, Mail } from "lucide-react";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";
import { ContentHeader, SectionLabel, Badge } from "./_shared";
import { formatBRL } from "@aethereos/kernel";
import type { InvoiceRow } from "./use-billing";

const STATUS_VARIANT: Record<
  InvoiceRow["status"],
  "success" | "warning" | "neutral"
> = {
  paid: "success",
  pending: "warning",
  failed: "warning",
  draft: "neutral",
  voided: "neutral",
};

const STATUS_LABEL: Record<InvoiceRow["status"], string> = {
  paid: "Paga",
  pending: "Pendente",
  failed: "Falhou",
  draft: "Rascunho",
  voided: "Cancelada",
};

function formatPeriod(start: string | null, end: string | null): string {
  if (start === null || end === null) return "—";
  const fmt = (s: string): string =>
    new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(start)} → ${fmt(end)}`;
}

export function TabHistoricoPagamentos(): React.ReactElement {
  const drivers = useDrivers();
  const companyId = useSessionStore((s) => s.activeCompanyId);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (drivers === null || companyId === null) return;
    const d = drivers;
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      const { data, error: err } = await d.data
        .from("invoices")
        .select(
          "id, amount_cents, currency, status, invoice_number, invoice_url, pdf_url, period_start, period_end, paid_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (err !== null && err !== undefined) {
        setError(
          typeof err === "object" && "message" in err
            ? String(err.message)
            : "Falha ao carregar",
        );
      } else {
        setRows((data ?? []) as InvoiceRow[]);
      }
      setLoading(false);
    }
    void load();

    const sub = d.data.subscribeToTable({
      table: "invoices",
      event: "*",
      onData: () => void load(),
    });
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [drivers, companyId]);

  return (
    <div>
      <ContentHeader
        icon={FileText}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Histórico de Pagamentos"
        subtitle="Faturas e status do ciclo"
      />

      <SectionLabel>Faturas recentes</SectionLabel>

      {loading ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            marginBottom: 24,
          }}
        >
          Carregando…
        </p>
      ) : error !== null ? (
        <p style={{ fontSize: 13, color: "#f87171", marginBottom: 24 }}>
          {error}
        </p>
      ) : rows.length === 0 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          Nenhuma fatura emitida ainda. Faturas aparecem aqui após upgrade ou ao
          final do ciclo de cobrança.
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.6fr 1fr 0.8fr auto",
              gap: 12,
              padding: "10px 14px",
              fontSize: 11,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span>Número</span>
            <span>Período</span>
            <span style={{ textAlign: "right" }}>Valor</span>
            <span>Status</span>
            <span aria-hidden="true" />
          </div>
          {rows.map((inv) => (
            <div
              key={inv.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.6fr 1fr 0.8fr auto",
                gap: 12,
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--text-secondary)",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                alignItems: "center",
              }}
            >
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {inv.invoice_number ?? inv.id.slice(0, 8)}
              </span>
              <span>{formatPeriod(inv.period_start, inv.period_end)}</span>
              <span
                style={{
                  textAlign: "right",
                  fontFamily: "var(--font-mono, ui-monospace, monospace)",
                  color: "var(--text-primary)",
                }}
              >
                {formatBRL(inv.amount_cents)}
              </span>
              <span>
                <Badge variant={STATUS_VARIANT[inv.status]}>
                  {STATUS_LABEL[inv.status]}
                </Badge>
              </span>
              <span>
                {inv.pdf_url !== null ? (
                  <a
                    href={inv.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Baixar fatura"
                    style={{
                      color: "var(--text-tertiary)",
                      display: "inline-flex",
                    }}
                  >
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}

      <SectionLabel>Nota fiscal eletrônica</SectionLabel>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: 16,
          fontSize: 13,
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Mail size={14} color="var(--text-tertiary)" />
        Para solicitar nota fiscal, entre em contato:{" "}
        <a href="mailto:financeiro@aethereos.io" style={{ color: "#a5b4fc" }}>
          financeiro@aethereos.io
        </a>
        . Emissão automática de NF-e está prevista para sprint futuro.
      </div>
    </div>
  );
}
