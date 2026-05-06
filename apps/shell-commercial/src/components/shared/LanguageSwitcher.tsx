/**
 * Super Sprint C / MX215 — LanguageSwitcher.
 *
 * Componente reutilizável para trocar idioma do sistema. Salva em
 * localStorage 'aethereos-language' (configurado no i18n.ts) e
 * aplica imediatamente sem reload.
 *
 * Uso:
 *   <LanguageSwitcher />            // dropdown completo
 *   <LanguageSwitcher compact />    // compact (apenas flag + código)
 */

import { useTranslation } from "react-i18next";

interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
];

interface Props {
  compact?: boolean;
}

export function LanguageSwitcher({
  compact = false,
}: Props): React.JSX.Element {
  const { i18n } = useTranslation();
  const current = i18n.language || "pt-BR";

  return (
    <select
      aria-label="Idioma / Language"
      value={current}
      onChange={(e) => {
        void i18n.changeLanguage(e.target.value);
      }}
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 6,
        padding: "6px 10px",
        color: "var(--text-primary)",
        fontSize: 13,
        cursor: "pointer",
        ...(compact ? { width: "auto" } : { minWidth: 200 }),
      }}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {compact ? `${l.flag} ${l.code}` : `${l.flag} ${l.label}`}
        </option>
      ))}
    </select>
  );
}
