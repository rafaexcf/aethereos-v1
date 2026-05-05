// Sprint 26: Autenticação 2FA — política global + status por colaborador.

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Toggle,
  ComingSoonSection,
} from "./_shared";

export function TabAutenticacao2FA() {
  const [requireAll, setRequireAll] = useState(false);
  const [requireAdmin, setRequireAdmin] = useState(true);
  const [rememberDevice, setRememberDevice] = useState(true);

  return (
    <div>
      <ContentHeader
        icon={BadgeCheck}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Autenticação em 2 Fatores"
        subtitle="Configure 2FA para colaboradores"
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Política global</SectionLabel>
        <SettingGroup>
          <SettingRow label="Obrigar 2FA para todos">
            <Toggle on={requireAll} onToggle={() => setRequireAll((v) => !v)} />
          </SettingRow>
          <SettingRow label="Obrigar 2FA apenas para admin/owner">
            <Toggle
              on={requireAdmin}
              onToggle={() => setRequireAdmin((v) => !v)}
            />
          </SettingRow>
          <SettingRow label="Permitir lembrar dispositivo por 30 dias" last>
            <Toggle
              on={rememberDevice}
              onToggle={() => setRememberDevice((v) => !v)}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Status por colaborador</SectionLabel>
        <ComingSoonSection
          icon={BadgeCheck}
          label="Lista com status TOTP por usuário"
          description="Reset de 2FA em caso de perda — em breve."
        />
      </div>
    </div>
  );
}
