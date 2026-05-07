// Sprint 26: Horários de Acesso — janela de acesso ao OS por escopo. UI
// local-state; persiste em kernel.access_schedules quando tabela existir.

import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Toggle,
  InlineButton,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

type ScopeKind = "company" | "department" | "role" | "user";

const SCOPE_OPTIONS: { value: ScopeKind; label: string }[] = [
  { value: "company", label: "Empresa toda" },
  { value: "department", label: "Por departamento" },
  { value: "role", label: "Por cargo" },
  { value: "user", label: "Por usuário" },
];

interface DayDef {
  key: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  short: string;
}

const DAYS: DayDef[] = [
  { key: "mon", short: "Seg" },
  { key: "tue", short: "Ter" },
  { key: "wed", short: "Qua" },
  { key: "thu", short: "Qui" },
  { key: "fri", short: "Sex" },
  { key: "sat", short: "Sáb" },
  { key: "sun", short: "Dom" },
];

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "8px 10px",
  fontFamily: "inherit",
};

export function TabHorariosAcesso() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [scope, setScope] = useState<ScopeKind>("company");
  const [enabledDays, setEnabledDays] = useState<
    Record<DayDef["key"], boolean>
  >({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [allowEmergency, setAllowEmergency] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function toggleDay(key: DayDef["key"]) {
    setEnabledDays((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeShorts = DAYS.filter((d) => enabledDays[d.key])
    .map((d) => d.short)
    .join(", ");
  const preview =
    activeShorts.length === 0
      ? "Nenhum dia selecionado"
      : `${activeShorts} · ${start}–${end} · America/Sao_Paulo`;

  async function handleSave() {
    setSaving(true);
    if (drivers !== null && activeCompanyId !== null) {
      try {
        await drivers.data.from("access_schedules").insert({
          company_id: activeCompanyId,
          scope,
          days: DAYS.filter((d) => enabledDays[d.key]).map((d) => d.key),
          start_time: start,
          end_time: end,
          allow_emergency: allowEmergency,
          timezone: "America/Sao_Paulo",
        });
      } catch {
        // tabela ainda não existe — mantém estado local
      }
    }
    setSavedAt(new Date().toLocaleTimeString("pt-BR"));
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ContentHeader
        icon={Calendar}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Horários de Acesso"
        subtitle="Janela de acesso ao OS por escopo."
      />

      <div>
        <SectionLabel>Escopo</SectionLabel>
        <SettingGroup>
          <SettingRow label="Aplicar a" sublabel="Defina o alvo da regra" last>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeKind)}
              aria-label="Escopo da janela de acesso"
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
              {SCOPE_OPTIONS.map((opt) => (
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
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Dias da semana</SectionLabel>
        <SettingGroup>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "16px",
            }}
          >
            {DAYS.map((d) => {
              const on = enabledDays[d.key];
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  aria-pressed={on}
                  style={{
                    background: on
                      ? "rgba(99,102,241,0.20)"
                      : "rgba(255,255,255,0.04)",
                    border: on
                      ? "1px solid rgba(99,102,241,0.6)"
                      : "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: on ? "#c7d2fe" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Janela horária</SectionLabel>
        <SettingGroup>
          <SettingRow label="Início" sublabel="Hora local (America/Sao_Paulo)">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label="Hora de início"
              style={INPUT_STYLE}
            />
          </SettingRow>
          <SettingRow
            label="Fim"
            sublabel="Hora local (America/Sao_Paulo)"
            last
          >
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="Hora de fim"
              style={INPUT_STYLE}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Acesso emergencial</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Permitir acesso emergencial com justificativa"
            sublabel="Usuário fora da janela registra motivo e segue com auditoria."
            last
          >
            <Toggle
              on={allowEmergency}
              onToggle={() => setAllowEmergency((v) => !v)}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Resumo</SectionLabel>
        <SettingGroup>
          <SettingRow label="Janela atual" sublabel={preview} last>
            <InlineButton
              variant="primary"
              onClick={() => {
                void handleSave();
              }}
            >
              {saving ? "Salvando…" : "Salvar configuração"}
            </InlineButton>
          </SettingRow>
        </SettingGroup>
        {savedAt !== null && (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 8,
            }}
          >
            Última gravação local às {savedAt}.
          </p>
        )}
      </div>
    </div>
  );
}
