// Sprint 26: Logo & Branding — visual da empresa no OS.

import { useState } from "react";
import { Building2 } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Toggle,
  InlineButton,
  ComingSoonSection,
} from "./_shared";

const ACCENT_COLORS: readonly string[] = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export function TabLogoBranding() {
  const [accent, setAccent] = useState<string>(ACCENT_COLORS[0] ?? "#6366f1");
  const [applyDark, setApplyDark] = useState(true);

  return (
    <div>
      <ContentHeader
        icon={Building2}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Logo & Branding"
        subtitle="Personalize visual da sua empresa no OS"
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Logo da empresa</SectionLabel>
        <SettingGroup>
          <SettingRow label="Logo PNG/SVG" last>
            <InlineButton
              onClick={() => {
                alert("Em breve");
              }}
            >
              Fazer upload
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Cor primária</SectionLabel>
        <SettingGroup>
          <SettingRow label="Acento">
            <div style={{ display: "flex", gap: 8 }}>
              {ACCENT_COLORS.map((color) => {
                const active = color === accent;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Cor ${color}`}
                    aria-pressed={active}
                    onClick={() => setAccent(color)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: color,
                      border: active
                        ? "2px solid #ffffff"
                        : "1px solid rgba(255,255,255,0.15)",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                      transition: "border 120ms ease",
                    }}
                  />
                );
              })}
            </div>
          </SettingRow>
          <SettingRow label="Aplicar a tema escuro também" last>
            <Toggle on={applyDark} onToggle={() => setApplyDark((v) => !v)} />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Subdomínio personalizado</SectionLabel>
        <ComingSoonSection
          icon={Building2}
          label="Subdomínio personalizado"
          description="Acesse o OS via empresa.aethereos.io — em breve."
        />
      </div>
    </div>
  );
}
