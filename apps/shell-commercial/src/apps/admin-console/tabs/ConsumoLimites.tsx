/**
 * Super Sprint E / MX238 — Consumo & Limites com dados reais.
 *
 * Lê billing-usage-report Edge Function. Mostra barras de progresso
 * por métrica (active_users, storage_bytes, ai_queries) e exibe os
 * alertas que vieram >= 80%.
 */

import * as React from "react";
import { Cpu, AlertTriangle } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
} from "./_shared";
import { useUsageReport } from "./use-billing";

interface MetricView {
  label: string;
  sublabel: string;
  color: string;
  current: number;
  limit: number;
  percent: number;
  formatted: string;
}

function colorForPct(pct: number): string {
  if (pct >= 95) return "#f87171";
  if (pct >= 80) return "#fbbf24";
  if (pct >= 60) return "#facc15";
  return "#34d399";
}

function UsageBar({
  pct,
  color,
}: {
  pct: number;
  color: string;
}): React.ReactElement {
  return (
    <div
      style={{
        width: 160,
        height: 6,
        borderRadius: 3,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
      aria-label={`${pct}% usado`}
    >
      <div
        style={{
          width: `${Math.max(2, pct)}%`,
          height: "100%",
          background: color,
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

export function TabConsumoLimites(): React.ReactElement {
  const { data, loading, error } = useUsageReport();

  if (loading) {
    return (
      <div>
        <ContentHeader
          icon={Cpu}
          iconBg="rgba(99,102,241,0.14)"
          iconColor="#a5b4fc"
          title="Consumo & Limites"
          subtitle="Carregando…"
        />
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Carregando dados…
        </p>
      </div>
    );
  }

  if (error !== null || data === null) {
    return (
      <div>
        <ContentHeader
          icon={Cpu}
          iconBg="rgba(239,68,68,0.14)"
          iconColor="#f87171"
          title="Consumo & Limites"
          subtitle="Falha ao carregar"
        />
        <p style={{ fontSize: 13, color: "#f87171" }}>
          {error ?? "Erro desconhecido"}
        </p>
      </div>
    );
  }

  const metrics: MetricView[] = [
    {
      label: "Usuários",
      sublabel: "Colaboradores ativos",
      color: "#818cf8",
      current: data.usage.active_users.current,
      limit: data.usage.active_users.limit,
      percent: data.usage.active_users.percent,
      formatted: `${data.usage.active_users.current} / ${data.usage.active_users.limit}`,
    },
    {
      label: "Armazenamento",
      sublabel: "Espaço de arquivos consumido",
      color: "#34d399",
      current: data.usage.storage_bytes.current,
      limit: data.usage.storage_bytes.limit,
      percent: data.usage.storage_bytes.percent,
      formatted: `${data.usage.storage_bytes.current_formatted} / ${data.usage.storage_bytes.limit_formatted}`,
    },
    {
      label: "Consultas IA",
      sublabel: "Mensagens enviadas ao Copilot no ciclo",
      color: "#fbbf24",
      current: data.usage.ai_queries.current,
      limit: data.usage.ai_queries.limit,
      percent: data.usage.ai_queries.percent,
      formatted: `${data.usage.ai_queries.current} / ${data.usage.ai_queries.limit}`,
    },
  ];

  return (
    <div>
      <ContentHeader
        icon={Cpu}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Consumo & Limites"
        subtitle={`Plano ${data.plan.name} — ciclo até ${new Date(data.period.end).toLocaleDateString("pt-BR")}`}
      />

      {data.alerts.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {data.alerts.map((alert) => (
            <div
              key={alert}
              role="status"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(251,191,36,0.10)",
                border: "1px solid rgba(251,191,36,0.30)",
                color: "#fbbf24",
                fontSize: 13,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <AlertTriangle size={14} />
              {alert}
            </div>
          ))}
        </div>
      )}

      <SectionLabel>Limites do plano atual</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        {metrics.map((m, idx) => {
          const dynColor = colorForPct(m.percent);
          return (
            <SettingRow
              key={m.label}
              label={m.label}
              sublabel={m.sublabel}
              last={idx === metrics.length - 1}
            >
              <span
                style={{
                  fontSize: 12,
                  color: dynColor,
                  fontFamily: "var(--font-mono, ui-monospace, monospace)",
                  minWidth: 140,
                  textAlign: "right",
                }}
              >
                {m.formatted} ({m.percent}%)
              </span>
              <UsageBar pct={m.percent} color={dynColor} />
            </SettingRow>
          );
        })}
      </SettingGroup>
    </div>
  );
}
