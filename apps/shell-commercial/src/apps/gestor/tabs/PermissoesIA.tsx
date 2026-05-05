import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Toggle,
  Badge,
  InlineButton,
  ComingSoonSection,
} from "./_shared";

interface QuemUsa {
  todos: boolean;
  somenteAdmin: boolean;
  customizada: boolean;
}

type Autonomia = "nivel-0" | "nivel-1";

export function TabPermissoesIA() {
  const [quemUsa, setQuemUsa] = useState<QuemUsa>({
    todos: true,
    somenteAdmin: false,
    customizada: false,
  });
  const [autonomia, setAutonomia] = useState<Autonomia>("nivel-0");
  const [notice, setNotice] = useState<string | null>(null);

  const toggleQuemUsa = (key: keyof QuemUsa) => {
    setQuemUsa((q) => ({ ...q, [key]: !q[key] }));
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2400);
  };

  return (
    <div>
      <ContentHeader
        icon={BadgeCheck}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Permissões de IA"
        subtitle="Quem usa o Copilot e como"
      />

      {notice !== null && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(99,102,241,0.10)",
            border: "1px solid rgba(99,102,241,0.25)",
            color: "#a5b4fc",
            fontSize: 12,
          }}
        >
          {notice}
        </div>
      )}

      <SectionLabel>Quem pode usar o Copilot</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        <SettingRow
          label="Todos os colaboradores"
          sublabel="Qualquer membro autenticado pode invocar o Copilot"
        >
          <Toggle on={quemUsa.todos} onToggle={() => toggleQuemUsa("todos")} />
        </SettingRow>
        <SettingRow
          label="Somente admin/owner"
          sublabel="Restringe o uso a perfis administrativos"
        >
          <Toggle
            on={quemUsa.somenteAdmin}
            onToggle={() => toggleQuemUsa("somenteAdmin")}
          />
        </SettingRow>
        <SettingRow
          label="Lista customizada"
          sublabel="Em breve — selecionar colaboradores específicos"
          last
        >
          <Badge variant="neutral">em breve</Badge>
          <Toggle
            on={quemUsa.customizada}
            onToggle={() =>
              showNotice("Lista customizada disponível em breve.")
            }
          />
        </SettingRow>
      </SettingGroup>

      <SectionLabel>Aprovação de proposals</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        <SettingRow
          label="Aprovadores padrão: owner + admin"
          sublabel="Quem precisa aprovar proposals geradas pelo agente"
          last
        >
          <Badge variant="neutral">Padrão</Badge>
          <InlineButton
            onClick={() => showNotice("Customização de aprovadores em breve.")}
          >
            Customizar aprovadores
          </InlineButton>
        </SettingRow>
      </SettingGroup>

      <SectionLabel>Nível de autonomia</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        <SettingRow
          label="Nível 0 — só sugere"
          sublabel="O agente sugere; humano executa toda ação"
        >
          <RadioPill
            active={autonomia === "nivel-0"}
            onClick={() => setAutonomia("nivel-0")}
            label="Nível 0"
          />
        </SettingRow>
        <SettingRow
          label="Nível 1 — sugere e executa com aprovação"
          sublabel="Agente executa após aprovação humana explícita"
          last
        >
          <RadioPill
            active={autonomia === "nivel-1"}
            onClick={() => setAutonomia("nivel-1")}
            label="Nível 1"
          />
        </SettingRow>
      </SettingGroup>

      <SectionLabel>Operações invariantes (Fundamentação 12.4)</SectionLabel>
      <ComingSoonSection
        icon={BadgeCheck}
        label="Sempre bloqueadas para o agente"
        description="Demissão · Transferência financeira · Exclusão de dados · Plano de contas · Acesso privilegiado · Cadastros fiscais."
      />
    </div>
  );
}

function RadioPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        background: active ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.05)",
        border: active
          ? "1px solid rgba(99,102,241,0.45)"
          : "1px solid rgba(255,255,255,0.10)",
        color: active ? "#c7d2fe" : "var(--text-secondary)",
        transition: "background 120ms ease",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: active ? "#818cf8" : "rgba(255,255,255,0.18)",
          display: "inline-block",
        }}
      />
      {label}
    </button>
  );
}
