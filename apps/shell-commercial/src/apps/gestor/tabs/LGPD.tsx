// Sprint 26: LGPD & Privacidade — compliance e direitos do titular.

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  ComingSoonSection,
} from "./_shared";

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 12,
  padding: "6px 10px",
  outline: "none",
  width: 240,
};

const SELECT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 12,
  padding: "6px 10px",
  cursor: "pointer",
  outline: "none",
};

export function TabLGPD() {
  const [dpoName, setDpoName] = useState("");
  const [dpoEmail, setDpoEmail] = useState("");
  const [dpoPhone, setDpoPhone] = useState("");

  const [auditRetention, setAuditRetention] = useState("2");
  const [chatRetention, setChatRetention] = useState("90");
  const [trashRetention, setTrashRetention] = useState("30");

  return (
    <div>
      <ContentHeader
        icon={BadgeCheck}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="LGPD & Privacidade"
        subtitle="Compliance e direitos do titular"
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>DPO (Encarregado de Dados)</SectionLabel>
        <SettingGroup>
          <SettingRow label="Nome do DPO">
            <input
              type="text"
              value={dpoName}
              onChange={(e) => setDpoName(e.target.value)}
              placeholder="Nome completo"
              aria-label="Nome do DPO"
              style={INPUT_STYLE}
            />
          </SettingRow>
          <SettingRow label="Email do DPO">
            <input
              type="email"
              value={dpoEmail}
              onChange={(e) => setDpoEmail(e.target.value)}
              placeholder="dpo@empresa.com.br"
              aria-label="Email do DPO"
              style={INPUT_STYLE}
            />
          </SettingRow>
          <SettingRow label="Telefone" last>
            <input
              type="tel"
              value={dpoPhone}
              onChange={(e) => setDpoPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              aria-label="Telefone do DPO"
              style={INPUT_STYLE}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Política de retenção</SectionLabel>
        <SettingGroup>
          <SettingRow label="Audit log: 2 anos (default)">
            <select
              value={auditRetention}
              onChange={(e) => setAuditRetention(e.target.value)}
              style={SELECT_STYLE}
              aria-label="Retenção de audit log"
            >
              <option value="1">1 ano</option>
              <option value="2">2 anos</option>
              <option value="5">5 anos</option>
              <option value="10">10 anos</option>
            </select>
          </SettingRow>
          <SettingRow label="Mensagens de chat: 90 dias">
            <select
              value={chatRetention}
              onChange={(e) => setChatRetention(e.target.value)}
              style={SELECT_STYLE}
              aria-label="Retenção de mensagens de chat"
            >
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
              <option value="365">365 dias</option>
            </select>
          </SettingRow>
          <SettingRow label="Arquivos deletados (lixeira): 30 dias" last>
            <select
              value={trashRetention}
              onChange={(e) => setTrashRetention(e.target.value)}
              style={SELECT_STYLE}
              aria-label="Retenção de lixeira"
            >
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
            </select>
          </SettingRow>
        </SettingGroup>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Direitos do titular</SectionLabel>
        <ComingSoonSection
          icon={BadgeCheck}
          label="Portal de direitos LGPD"
          description="Acesso, correção, exclusão, portabilidade — em breve."
        />
      </div>

      <div>
        <SectionLabel>Exportar dados da empresa</SectionLabel>
        <SettingGroup>
          <SettingRow label="Backup completo" last>
            <InlineButton
              variant="primary"
              onClick={() => {
                alert(
                  "Solicitação registrada — você receberá um email com link em até 24h",
                );
              }}
            >
              Solicitar export
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}
