import { HardDrive } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  ComingSoonSection,
  TILE_BASE,
} from "./_shared";

const STAT_LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const STAT_VALUE: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "var(--text-primary)",
  marginTop: 6,
  fontFamily: "var(--font-display)",
};

export function TabHistoricoIA() {
  return (
    <div>
      <ContentHeader
        icon={HardDrive}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Histórico & Custos de IA"
        subtitle="Conversas, tokens e gastos"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={TILE_BASE}>
          <span style={STAT_LABEL}>Conversas hoje</span>
          <span style={STAT_VALUE}>—</span>
        </div>
        <div style={TILE_BASE}>
          <span style={STAT_LABEL}>Tokens 7d</span>
          <span style={STAT_VALUE}>—</span>
        </div>
        <div style={TILE_BASE}>
          <span style={STAT_LABEL}>Custo mês</span>
          <span style={STAT_VALUE}>—</span>
        </div>
      </div>

      <SectionLabel>Conversas recentes</SectionLabel>
      <ComingSoonSection
        icon={HardDrive}
        label="Histórico de conversas do Copilot"
        description="Auditoria por usuário, custo e tokens — em breve."
      />
    </div>
  );
}
