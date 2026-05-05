// Sprint 26: Regras de Distribuição — define apps obrigatórios, opcionais ou
// restritos por colaborador. Estado local-only por enquanto.

import { useState } from "react";
import { ClipboardList, Package } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Toggle,
  ComingSoonSection,
} from "./_shared";

interface DistRule {
  key: "required" | "optional" | "restricted" | "block-store";
  label: string;
  sublabel: string;
  initial: boolean;
}

const RULES: DistRule[] = [
  {
    key: "required",
    label: "Apps obrigatórios",
    sublabel: "Todos veem",
    initial: true,
  },
  {
    key: "optional",
    label: "Apps opcionais",
    sublabel: "Colaboradores podem instalar via Magic Store",
    initial: true,
  },
  {
    key: "restricted",
    label: "Apps restritos",
    sublabel: "Apenas admin/owner instalam",
    initial: false,
  },
  {
    key: "block-store",
    label: "Bloquear Magic Store",
    sublabel: "Esconder loja para não-admins",
    initial: false,
  },
];

export function TabRegrasDistribuicao() {
  const [state, setState] = useState<Record<DistRule["key"], boolean>>(() =>
    RULES.reduce(
      (acc, r) => ({ ...acc, [r.key]: r.initial }),
      {} as Record<DistRule["key"], boolean>,
    ),
  );

  function toggle(key: DistRule["key"]) {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ContentHeader
        icon={ClipboardList}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Regras de Distribuição"
        subtitle="Apps obrigatórios, opcionais ou restritos por colaborador."
      />

      <div>
        <SectionLabel>Modo de distribuição</SectionLabel>
        <SettingGroup>
          {RULES.map((rule, idx) => (
            <SettingRow
              key={rule.key}
              label={rule.label}
              sublabel={rule.sublabel}
              last={idx === RULES.length - 1}
            >
              <Toggle on={state[rule.key]} onToggle={() => toggle(rule.key)} />
            </SettingRow>
          ))}
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Whitelist de apps</SectionLabel>
        <ComingSoonSection
          icon={Package}
          label="Lista de apps liberados pra auto-instalação"
          description="Em breve."
        />
      </div>
    </div>
  );
}
