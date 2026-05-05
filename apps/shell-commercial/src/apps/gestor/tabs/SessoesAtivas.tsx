// Sprint 26: Sessões Ativas — sessões em uso pela equipe.

import { Network } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  ComingSoonSection,
} from "./_shared";

export function TabSessoesAtivas() {
  return (
    <div>
      <ContentHeader
        icon={Network}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Sessões Ativas"
        subtitle="Sessões em uso pela equipe"
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Suas sessões</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Sessão atual · este navegador"
            sublabel="IP 187.45.32.18 · agora"
            last
          >
            <InlineButton
              variant="danger"
              onClick={() => {
                alert("Em breve");
              }}
            >
              Encerrar
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Sessões da equipe</SectionLabel>
        <ComingSoonSection
          icon={Network}
          label="Lista de sessões ativas por colaborador"
          description="Encerrar individualmente ou em massa."
        />
      </div>
    </div>
  );
}
