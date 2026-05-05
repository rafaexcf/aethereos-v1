// Sprint 26: Cargos & Hierarquia — referencia das roles do kernel + slot para
// cargos customizados (mapping label livre -> role do kernel) que vira em
// sprint futuro.

import type { ComponentType } from "react";
import {
  Network,
  BadgeCheck,
  Crown,
  ShieldCheck,
  Briefcase,
  User,
  Eye,
  type LucideProps,
} from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Badge,
  ComingSoonSection,
} from "./_shared";

interface RoleEntry {
  label: string;
  slug: string;
  scope: string;
  icon: ComponentType<LucideProps>;
  color: string;
}

const ROLES: RoleEntry[] = [
  {
    label: "Proprietário",
    slug: "owner",
    scope: "Acesso total · billing, governança, exclusão de empresa",
    icon: Crown,
    color: "#fbbf24",
  },
  {
    label: "Administrador",
    slug: "admin",
    scope: "Gestão completa exceto billing e exclusão de empresa",
    icon: ShieldCheck,
    color: "#a5b4fc",
  },
  {
    label: "Gestor de setor",
    slug: "manager",
    scope: "Gestão limitada ao seu departamento e equipe direta",
    icon: Briefcase,
    color: "#34d399",
  },
  {
    label: "Colaborador",
    slug: "member",
    scope: "Acesso operacional aos apps liberados pelo gestor",
    icon: User,
    color: "#60a5fa",
  },
  {
    label: "Visualizador",
    slug: "viewer",
    scope: "Apenas leitura — sem permissão de criar ou editar",
    icon: Eye,
    color: "#94a3b8",
  },
];

function RoleIconCircle({
  Icon,
  color,
}: {
  Icon: RoleEntry["icon"];
  color: string;
}) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: `${color}28`,
        border: `1px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={14} strokeWidth={1.8} style={{ color }} />
    </div>
  );
}

export function TabCargosHierarquia() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ContentHeader
        icon={Network}
        iconBg="rgba(99,102,241,0.18)"
        iconColor="#a5b4fc"
        title="Cargos & Hierarquia"
        subtitle="Roles padrão do kernel + cargos customizados"
      />

      <div>
        <SectionLabel>Hierarquia padrão</SectionLabel>
        <SettingGroup>
          {ROLES.map((r, i) => (
            <SettingRow
              key={r.slug}
              last={i === ROLES.length - 1}
              label={r.label}
              sublabel={r.scope}
              icon={<RoleIconCircle Icon={r.icon} color={r.color} />}
            >
              <Badge variant="neutral">{r.slug}</Badge>
            </SettingRow>
          ))}
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Cargos customizados</SectionLabel>
        <ComingSoonSection
          icon={BadgeCheck}
          label="Mapeie labels (ex: 'Diretor Financeiro') para roles do kernel — em breve"
          description="Você poderá definir títulos personalizados que mapeiam para uma role base, mantendo a hierarquia operacional intacta."
        />
      </div>
    </div>
  );
}
