import { FileText } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Badge,
  ComingSoonSection,
} from "./_shared";

export function TabHistoricoPagamentos() {
  return (
    <div>
      <ContentHeader
        icon={FileText}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Histórico de Pagamentos"
        subtitle="Faturas, status e download de NF"
      />

      <SectionLabel>Faturas recentes</SectionLabel>
      <div style={{ marginBottom: 24 }}>
        <ComingSoonSection
          icon={FileText}
          label="Histórico via Lago (em breve)"
          description="Integração com sistema de billing prevista para Sprint 32+."
        />
      </div>

      <SectionLabel>Método de pagamento</SectionLabel>
      <SettingGroup>
        <SettingRow label="Cartão de crédito (em breve)" last>
          <Badge variant="neutral">em breve</Badge>
        </SettingRow>
      </SettingGroup>
    </div>
  );
}
