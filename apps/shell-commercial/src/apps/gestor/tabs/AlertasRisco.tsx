// Sprint 26: Alertas de Risco — eventos de segurança monitorados.

import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Toggle,
  Badge,
  ComingSoonSection,
} from "./_shared";

interface AlertToggleState {
  ipIncomum: boolean;
  loginFalho: boolean;
  foraHorario: boolean;
  downloadMassivo: boolean;
  alteracaoPermissoes: boolean;
}

export function TabAlertasRisco() {
  const [alerts, setAlerts] = useState<AlertToggleState>({
    ipIncomum: true,
    loginFalho: true,
    foraHorario: true,
    downloadMassivo: true,
    alteracaoPermissoes: true,
  });

  const toggle = (key: keyof AlertToggleState) => {
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <ContentHeader
        icon={Settings2}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Alertas de Risco"
        subtitle="Eventos de segurança que merecem atenção"
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Tipos de alerta monitorados</SectionLabel>
        <SettingGroup>
          <SettingRow label="Login de IP incomum">
            <Badge variant="info">Detecta geo</Badge>
            <Toggle
              on={alerts.ipIncomum}
              onToggle={() => toggle("ipIncomum")}
            />
          </SettingRow>
          <SettingRow label="Múltiplas tentativas de login falhas">
            <Toggle
              on={alerts.loginFalho}
              onToggle={() => toggle("loginFalho")}
            />
          </SettingRow>
          <SettingRow label="Acesso fora do horário configurado">
            <Toggle
              on={alerts.foraHorario}
              onToggle={() => toggle("foraHorario")}
            />
          </SettingRow>
          <SettingRow label="Download massivo de dados">
            <Toggle
              on={alerts.downloadMassivo}
              onToggle={() => toggle("downloadMassivo")}
            />
          </SettingRow>
          <SettingRow label="Alteração de permissões sensíveis" last>
            <Toggle
              on={alerts.alteracaoPermissoes}
              onToggle={() => toggle("alteracaoPermissoes")}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Alertas recentes</SectionLabel>
        <ComingSoonSection
          icon={Settings2}
          label="Feed de alertas em tempo real"
          description="Integração com kernel.security_alerts em breve."
        />
      </div>
    </div>
  );
}
