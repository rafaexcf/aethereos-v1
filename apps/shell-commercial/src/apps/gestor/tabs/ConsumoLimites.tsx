import { Cpu } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  ComingSoonSection,
} from "./_shared";

interface UsageMetric {
  label: string;
  sublabel: string;
  used: number;
  total: number | null;
  unit: string;
  color: string;
}

const METRICS: UsageMetric[] = [
  {
    label: "Usuários",
    sublabel: "Colaboradores ativos no plano",
    used: 12,
    total: 50,
    unit: "",
    color: "#818cf8",
  },
  {
    label: "Storage",
    sublabel: "Espaço de arquivos consumido",
    used: 4.2,
    total: 25,
    unit: "GB",
    color: "#34d399",
  },
  {
    label: "Tokens IA",
    sublabel: "Quota mensal de tokens",
    used: 1.2,
    total: 5,
    unit: "M",
    color: "#fbbf24",
  },
  {
    label: "Apps",
    sublabel: "Aplicativos instalados",
    used: 8,
    total: null,
    unit: "",
    color: "#a5b4fc",
  },
];

function UsageBar({
  used,
  total,
  color,
}: {
  used: number;
  total: number | null;
  color: string;
}) {
  const pct = total === null ? 0 : Math.min(100, (used / total) * 100);
  return (
    <div
      style={{
        width: 140,
        height: 5,
        borderRadius: 3,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
      aria-label={`${used} de ${total ?? "ilimitado"}`}
    >
      <div
        style={{
          width: total === null ? "100%" : `${pct}%`,
          height: "100%",
          background: total === null ? "rgba(255,255,255,0.18)" : color,
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

function formatUsage(m: UsageMetric): string {
  if (m.total === null) return `${m.used} / unlimited`;
  return `${m.used} / ${m.total}${m.unit !== "" ? " " + m.unit : ""}`;
}

export function TabConsumoLimites() {
  return (
    <div>
      <ContentHeader
        icon={Cpu}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Consumo & Limites do Plano"
        subtitle="Barras de progresso por dimensão"
      />

      <SectionLabel>Limites do plano atual</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        {METRICS.map((m, idx) => (
          <SettingRow
            key={m.label}
            label={m.label}
            sublabel={m.sublabel}
            last={idx === METRICS.length - 1}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                minWidth: 100,
                textAlign: "right",
              }}
            >
              {formatUsage(m)}
            </span>
            <UsageBar used={m.used} total={m.total} color={m.color} />
          </SettingRow>
        ))}
      </SettingGroup>

      <SectionLabel>Acesso a recursos premium</SectionLabel>
      <ComingSoonSection
        icon={Cpu}
        label="Recursos premium do plano"
        description="Detalhamento de features por tier (ER, AI Copilot avançado, SSO) — em breve."
      />
    </div>
  );
}
