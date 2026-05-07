// Sprint 26: Dispositivos — gerenciamento de dispositivos confiáveis.

import { HardDrive } from "lucide-react";
import { ContentHeader, SectionLabel, ComingSoonSection } from "./_shared";

export function TabDispositivos() {
  return (
    <div>
      <ContentHeader
        icon={HardDrive}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Dispositivos"
        subtitle="Gerencie dispositivos confiáveis"
      />

      <div>
        <SectionLabel>Dispositivos confiáveis</SectionLabel>
        <ComingSoonSection
          icon={HardDrive}
          label="Lista de dispositivos por usuário"
          description="Marque como confiável ou bloqueie. Alerta de novo dispositivo via email."
        />
      </div>
    </div>
  );
}
