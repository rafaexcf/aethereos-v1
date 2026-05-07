// Sprint 26: Configurações por App — cada app instalado pode ter
// configurações específicas (por empresa, departamento ou usuário). Por
// enquanto só o launcher; cada "Configurar" exibe alerta "em breve".

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  ComingSoonSection,
} from "./_shared";
import { APP_REGISTRY } from "../../registry";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

interface CompanyModuleRow {
  module: string;
}

function appName(appId: string): string {
  const found = APP_REGISTRY.find((a) => a.id === appId);
  return found?.name ?? appId;
}

export function TabConfigPorApp() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();
  const [installed, setInstalled] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = (await drivers.data
          .from("company_modules")
          .select("module")
          .eq("company_id", activeCompanyId)) as unknown as {
          data: CompanyModuleRow[] | null;
          error: { message: string } | null;
        };
        if (cancelled) return;
        if (res.error !== null) {
          setReady(true);
          return;
        }
        const ids = (res.data ?? []).map((r) => r.module);
        setInstalled(ids);
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, activeCompanyId]);

  function handleConfigure(appId: string) {
    alert(`Configuração avançada de "${appName(appId)}" em breve.`);
  }

  const hasApps = ready && installed.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ContentHeader
        icon={Settings2}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Configurações por App"
        subtitle="Configurações por empresa, departamento ou usuário."
      />

      <div>
        <SectionLabel>Apps configuráveis</SectionLabel>
        {!ready ? (
          <SettingGroup>
            <SettingRow label="Carregando apps…" sublabel="Aguarde" last />
          </SettingGroup>
        ) : !hasApps ? (
          <ComingSoonSection
            icon={Settings2}
            label="Nenhum app instalado nesta empresa"
            description="Instale apps na Magic Store para configurá-los aqui."
          />
        ) : (
          <SettingGroup>
            {installed.map((appId, idx) => (
              <SettingRow
                key={appId}
                label={appName(appId)}
                sublabel={`ID: ${appId}`}
                last={idx === installed.length - 1}
              >
                <InlineButton onClick={() => handleConfigure(appId)}>
                  Configurar
                </InlineButton>
              </SettingRow>
            ))}
          </SettingGroup>
        )}
      </div>
    </div>
  );
}
