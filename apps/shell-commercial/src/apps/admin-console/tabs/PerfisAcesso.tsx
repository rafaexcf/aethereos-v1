// Sprint 26: Perfis de Acesso — templates de permissões aplicáveis a
// cargos/grupos/indivíduos. Lista os scopes principais do SDK; criação de
// perfis customizados fica como ComingSoonSection.

import { BadgeCheck } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Badge,
  ComingSoonSection,
} from "./_shared";

interface ScopeRow {
  id: string;
  description: string;
  sensitive: boolean;
}

const SCOPES: ScopeRow[] = [
  {
    id: "auth.read",
    description: "Ler dados básicos do usuário autenticado.",
    sensitive: false,
  },
  {
    id: "drive.read",
    description: "Listar e abrir arquivos do Drive.",
    sensitive: false,
  },
  {
    id: "drive.write",
    description: "Criar, renomear e atualizar arquivos do Drive.",
    sensitive: false,
  },
  {
    id: "drive.delete",
    description: "Excluir arquivos do Drive permanentemente.",
    sensitive: true,
  },
  {
    id: "people.read",
    description: "Ler diretório de colaboradores e cargos.",
    sensitive: false,
  },
  {
    id: "ai.chat",
    description: "Consumir LLM via gateway (custo por token).",
    sensitive: true,
  },
  {
    id: "scp.emit",
    description: "Emitir eventos no barramento SCP em nome do usuário.",
    sensitive: false,
  },
];

export function TabPerfisAcesso() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ContentHeader
        icon={BadgeCheck}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Perfis de Acesso"
        subtitle="Templates de permissões aplicáveis a cargos, grupos ou indivíduos."
      />

      <div>
        <SectionLabel>Scopes do sistema (SDK)</SectionLabel>
        <SettingGroup>
          {SCOPES.map((scope, idx) => (
            <SettingRow
              key={scope.id}
              label={scope.id}
              sublabel={scope.description}
              last={idx === SCOPES.length - 1}
            >
              {scope.sensitive ? (
                <Badge variant="info">Sensível</Badge>
              ) : (
                <Badge variant="neutral">Padrão</Badge>
              )}
            </SettingRow>
          ))}
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Perfis customizados (em breve)</SectionLabel>
        <ComingSoonSection
          icon={BadgeCheck}
          label="Crie perfis como 'Vendedor Júnior' agrupando scopes"
          description="Aplique a cargos/grupos/indivíduos com resolução de conflito (deny prevalece, exceto owner/admin)."
        />
      </div>
    </div>
  );
}
