// Sprint 26: Fuso Horário & Idioma — preferências regionais.

import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
} from "./_shared";

const TIMEZONES: readonly { value: string; label: string }[] = [
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (GMT-3)" },
  { value: "America/New_York", label: "America/New_York (GMT-5)" },
  { value: "Europe/London", label: "Europe/London (GMT+0)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+9)" },
  { value: "UTC", label: "UTC" },
];

const LANGUAGES: readonly { value: string; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es", label: "Español" },
];

const DATE_FORMATS: readonly { value: string; label: string }[] = [
  { value: "dd/mm/yyyy", label: "dd/mm/aaaa" },
  { value: "mm/dd/yyyy", label: "mm/dd/yyyy" },
  { value: "yyyy-mm-dd", label: "yyyy-mm-dd" },
];

const SELECT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 12,
  padding: "6px 10px",
  cursor: "pointer",
  outline: "none",
};

export function TabFusoIdioma() {
  const [timezone, setTimezone] = useState<string>("America/Sao_Paulo");
  const [language, setLanguage] = useState<string>("pt-BR");
  const [dateFormat, setDateFormat] = useState<string>("dd/mm/yyyy");

  return (
    <div>
      <ContentHeader
        icon={Calendar}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Fuso Horário & Idioma"
        subtitle="Preferências regionais da empresa"
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Fuso horário padrão</SectionLabel>
        <SettingGroup>
          <SettingRow label="Fuso" last>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={SELECT_STYLE}
              aria-label="Fuso horário"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </SettingRow>
        </SettingGroup>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Idioma</SectionLabel>
        <SettingGroup>
          {LANGUAGES.map((lang, idx) => {
            const active = lang.value === language;
            const last = idx === LANGUAGES.length - 1;
            return (
              <SettingRow key={lang.value} label={lang.label} last={last}>
                <button
                  type="button"
                  onClick={() => setLanguage(lang.value)}
                  aria-pressed={active}
                  style={{
                    background: active
                      ? "rgba(99,102,241,0.20)"
                      : "rgba(255,255,255,0.06)",
                    border: active
                      ? "1px solid rgba(99,102,241,0.55)"
                      : "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: active ? "#c7d2fe" : "var(--text-primary)",
                    cursor: "pointer",
                    transition: "all 120ms ease",
                  }}
                >
                  {active ? "Selecionado" : "Selecionar"}
                </button>
              </SettingRow>
            );
          })}
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Formato de data</SectionLabel>
        <SettingGroup>
          <SettingRow label="Padrão" last>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              style={SELECT_STYLE}
              aria-label="Formato de data"
            >
              {DATE_FORMATS.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </select>
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}
