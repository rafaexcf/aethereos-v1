// Sprint 26: Regras por App — define quem pode usar cada app instalado.
// Lista todos os apps de company_modules e oferece select de modo de
// distribuição. Persistência em kernel.app_access_rules opcional (try/catch).

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  ComingSoonSection,
} from "./_shared";
import { APP_REGISTRY } from "../../registry";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

type AccessMode = "all" | "by-role" | "by-department" | "by-list" | "blocked";

const MODE_OPTIONS: { value: AccessMode; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "by-role", label: "Por cargo" },
  { value: "by-department", label: "Por departamento" },
  { value: "by-list", label: "Por lista" },
  { value: "blocked", label: "Bloqueado" },
];

const MODE_LABEL: Record<AccessMode, string> = {
  all: "Distribuição: Todos",
  "by-role": "Distribuição: Por cargo",
  "by-department": "Distribuição: Por departamento",
  "by-list": "Distribuição: Por lista",
  blocked: "Distribuição: Bloqueado",
};

interface CompanyModuleRow {
  module: string;
}

function appName(appId: string): string {
  const found = APP_REGISTRY.find((a) => a.id === appId);
  return found?.name ?? appId;
}

export function TabRegrasApp() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();
  const [installed, setInstalled] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [modes, setModes] = useState<Record<string, AccessMode>>({});

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

  function getMode(appId: string): AccessMode {
    return modes[appId] ?? "all";
  }

  function setMode(appId: string, mode: AccessMode) {
    setModes((prev) => ({ ...prev, [appId]: mode }));
    if (drivers === null || activeCompanyId === null) return;
    void (async () => {
      try {
        await drivers.data.from("app_access_rules").upsert({
          company_id: activeCompanyId,
          app_id: appId,
          mode,
        });
      } catch {
        // tabela ainda não existe — mantém estado local
      }
    })();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ContentHeader
        icon={Settings2}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Regras por App"
        subtitle="Defina quem pode usar cada app instalado."
      />

      <div>
        <SectionLabel>Apps instalados</SectionLabel>
        {!ready ? (
          <SettingGroup>
            <SettingRow label="Carregando apps…" sublabel="Aguarde" last />
          </SettingGroup>
        ) : installed.length === 0 ? (
          <ComingSoonSection
            icon={Settings2}
            label="Nenhum app instalado nesta empresa"
            description="Instale apps na Magic Store para configurar regras de distribuição."
          />
        ) : (
          <SettingGroup>
            {installed.map((appId, idx) => {
              const mode = getMode(appId);
              return (
                <SettingRow
                  key={appId}
                  label={appName(appId)}
                  sublabel={MODE_LABEL[mode]}
                  last={idx === installed.length - 1}
                >
                  <select
                    value={mode}
                    onChange={(e) =>
                      setMode(appId, e.target.value as AccessMode)
                    }
                    aria-label={`Modo de distribuição de ${appName(appId)}`}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                      fontSize: 12,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    {MODE_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        style={{ background: "#191d21" }}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </SettingRow>
              );
            })}
          </SettingGroup>
        )}
      </div>
    </div>
  );
}
