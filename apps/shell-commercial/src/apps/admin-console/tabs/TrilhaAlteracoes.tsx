// Sprint 26: stub do tab "Trilha de Alteracoes". Implementacao real em sprint futura.

import { FileText } from "lucide-react";
import { ComingSoonSection, ContentHeader } from "./_shared";

export function TabTrilhaAlteracoes() {
  return (
    <div>
      <ContentHeader
        icon={FileText}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Trilha de Alteracoes"
        subtitle="Diff por entidade ao longo do tempo"
      />
      <ComingSoonSection
        icon={FileText}
        label="Trilha de Alteracoes"
        description="Vamos exibir o diff campo a campo das entidades editadas. Em breve."
      />
    </div>
  );
}
