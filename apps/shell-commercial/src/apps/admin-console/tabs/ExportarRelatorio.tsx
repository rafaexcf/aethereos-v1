// Sprint 26: stub do tab "Exportar Relatorio". Exports CSV/JSON em sprint futura.

import { FileText } from "lucide-react";
import { ComingSoonSection, ContentHeader } from "./_shared";

export function TabExportarRelatorio() {
  return (
    <div>
      <ContentHeader
        icon={FileText}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Exportar Relatorio"
        subtitle="Exports de auditoria em CSV/JSON"
      />
      <ComingSoonSection
        icon={FileText}
        label="Exportar Relatorio"
        description="CSV/JSON exports - em breve."
      />
    </div>
  );
}
