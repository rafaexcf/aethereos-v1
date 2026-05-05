import { useState, useEffect, useRef } from "react";
import { Settings2 } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  ComingSoonSection,
} from "./_shared";

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "6px 10px",
  color: "var(--text-primary)",
  fontSize: 13,
  width: 100,
  outline: "none",
};

function generateApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `aeth_${hex}`;
}

export function TabApisExternas() {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<string>("60");
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const handleGenerate = () => {
    const key = generateApiKey();
    setRevealedKey(key);
    setNotice("Copie e guarde — a key não será exibida de novo.");
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setRevealedKey(null);
      setNotice(null);
    }, 30000);
  };

  return (
    <div>
      <ContentHeader
        icon={Settings2}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="APIs Externas"
        subtitle="API keys da empresa para acesso programático"
      />

      {notice !== null && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.30)",
            color: "#fbbf24",
            fontSize: 12,
          }}
        >
          {notice}
        </div>
      )}

      <SectionLabel>API keys</SectionLabel>
      <SettingGroup style={{ marginBottom: 12 }}>
        {revealedKey === null ? (
          <SettingRow label="Nenhuma key gerada" last />
        ) : (
          <SettingRow
            label="Nova API key"
            sublabel="Visível apenas por 30 segundos"
            last
          >
            <code
              style={{
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                fontSize: 12,
                background: "rgba(255,255,255,0.06)",
                padding: "4px 10px",
                borderRadius: 6,
                color: "#a5b4fc",
                userSelect: "all",
              }}
            >
              {revealedKey}
            </code>
          </SettingRow>
        )}
      </SettingGroup>

      <div style={{ marginBottom: 24 }}>
        <InlineButton variant="primary" onClick={handleGenerate}>
          Gerar nova API key
        </InlineButton>
      </div>

      <SectionLabel>Rate limiting</SectionLabel>
      <SettingGroup style={{ marginBottom: 24 }}>
        <SettingRow
          label="Requests/min"
          sublabel="Limite de chamadas por minuto por key"
          last
        >
          <input
            type="number"
            min={1}
            aria-label="Requests por minuto"
            value={rateLimit}
            onChange={(e) => setRateLimit(e.target.value)}
            style={INPUT_STYLE}
          />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            req/min
          </span>
        </SettingRow>
      </SettingGroup>

      <SectionLabel>Logs de chamadas</SectionLabel>
      <ComingSoonSection
        icon={Settings2}
        label="Logs de chamadas à API"
        description="Auditoria de requisições, status codes e latência — em breve."
      />
    </div>
  );
}
