import { useState } from "react";
import { Cpu } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Toggle,
  TILE_BASE,
} from "./_shared";

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "6px 10px",
  color: "var(--text-primary)",
  fontSize: 13,
  width: 180,
  outline: "none",
};

interface QuotaState {
  empresa: string;
  departamento: string;
  colaborador: string;
}

interface AlertasState {
  warn80: boolean;
  warn95: boolean;
  bloquear: boolean;
}

export function TabLimitesUsoIA() {
  const [quota, setQuota] = useState<QuotaState>({
    empresa: "5000000",
    departamento: "500000",
    colaborador: "50000",
  });
  const [alertas, setAlertas] = useState<AlertasState>({
    warn80: true,
    warn95: true,
    bloquear: false,
  });

  const updateQuota = (key: keyof QuotaState, value: string) => {
    setQuota((q) => ({ ...q, [key]: value }));
  };

  const toggleAlerta = (key: keyof AlertasState) => {
    setAlertas((a) => ({ ...a, [key]: !a[key] }));
  };

  return (
    <div>
      <ContentHeader
        icon={Cpu}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Limites de Uso de IA"
        subtitle="Quota mensal de tokens por escopo"
      />

      <SectionLabel>Quota mensal por nível</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        <SettingRow
          label="Empresa total"
          sublabel="Limite global compartilhado entre todos os usuários"
        >
          <input
            type="number"
            aria-label="Quota total da empresa em tokens"
            value={quota.empresa}
            onChange={(e) => updateQuota("empresa", e.target.value)}
            style={INPUT_STYLE}
          />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            tokens
          </span>
        </SettingRow>
        <SettingRow
          label="Por departamento"
          sublabel="Quota máxima permitida por departamento"
        >
          <input
            type="number"
            aria-label="Quota por departamento em tokens"
            value={quota.departamento}
            onChange={(e) => updateQuota("departamento", e.target.value)}
            style={INPUT_STYLE}
          />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            tokens
          </span>
        </SettingRow>
        <SettingRow
          label="Por colaborador"
          sublabel="Quota individual por usuário"
          last
        >
          <input
            type="number"
            aria-label="Quota por colaborador em tokens"
            value={quota.colaborador}
            onChange={(e) => updateQuota("colaborador", e.target.value)}
            style={INPUT_STYLE}
          />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            tokens
          </span>
        </SettingRow>
      </SettingGroup>

      <SectionLabel>Alertas</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        <SettingRow
          label="Alertar ao atingir 80%"
          sublabel="Notifica admins quando a quota atingir 80%"
        >
          <Toggle on={alertas.warn80} onToggle={() => toggleAlerta("warn80")} />
        </SettingRow>
        <SettingRow
          label="Alertar ao atingir 95%"
          sublabel="Notifica admins quando a quota atingir 95%"
        >
          <Toggle on={alertas.warn95} onToggle={() => toggleAlerta("warn95")} />
        </SettingRow>
        <SettingRow
          label="Bloquear ao exceder quota"
          sublabel="Suspende novas requisições até reset ou aumento da quota"
          last
        >
          <Toggle
            on={alertas.bloquear}
            onToggle={() => toggleAlerta("bloquear")}
          />
        </SettingRow>
      </SettingGroup>

      <SectionLabel>Consumo atual (mock)</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <div style={TILE_BASE}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Tokens usados
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginTop: 6,
              fontFamily: "var(--font-display)",
            }}
          >
            1.2M
          </span>
        </div>
        <div style={TILE_BASE}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Custo estimado
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginTop: 6,
              fontFamily: "var(--font-display)",
            }}
          >
            R$ 12,40
          </span>
        </div>
        <div style={TILE_BASE}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Tendência
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#34d399",
              marginTop: 6,
              fontFamily: "var(--font-display)",
            }}
          >
            ↑ 8%
          </span>
        </div>
      </div>
    </div>
  );
}
