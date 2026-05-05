import { useState } from "react";
import { Network, Plus, X } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Badge,
  InlineButton,
  ComingSoonSection,
} from "./_shared";

interface Webhook {
  id: string;
  event: string;
  url: string;
  retries: number;
}

const EVENT_OPTIONS = [
  "platform.file.uploaded",
  "platform.file.deleted",
  "platform.user.created",
  "platform.notification.emitted",
  "agent.proposal.created",
] as const;

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
  display: "block",
};

function genId(): string {
  return `wh_${Math.random().toString(36).slice(2, 10)}`;
}

export function TabWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<{
    event: string;
    url: string;
    retries: number;
  }>({
    event: EVENT_OPTIONS[0],
    url: "",
    retries: 3,
  });

  const handleCreate = () => {
    if (draft.url.trim() === "") return;
    setWebhooks((prev) => [
      ...prev,
      {
        id: genId(),
        event: draft.event,
        url: draft.url.trim(),
        retries: draft.retries,
      },
    ]);
    setDraft({ event: EVENT_OPTIONS[0], url: "", retries: 3 });
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div>
      <ContentHeader
        icon={Network}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Webhooks"
        subtitle="POST para URLs externas quando eventos SCP acontecem"
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <SectionLabel>Webhooks ativos</SectionLabel>
        {!showForm && (
          <InlineButton variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={13} strokeWidth={2} />
            Adicionar webhook
          </InlineButton>
        )}
      </div>

      <SettingGroup style={{ marginBottom: 24 }}>
        {webhooks.length === 0 && !showForm && (
          <SettingRow
            label="Nenhum webhook configurado"
            sublabel="Clique em adicionar para criar um novo endpoint"
            last
          />
        )}

        {webhooks.map((wh, idx) => (
          <SettingRow
            key={wh.id}
            label={wh.url}
            sublabel={`Evento: ${wh.event} · Retries: ${wh.retries}`}
            last={idx === webhooks.length - 1 && !showForm}
          >
            <Badge variant="success">ativo</Badge>
            <InlineButton variant="danger" onClick={() => handleRemove(wh.id)}>
              <X size={12} strokeWidth={2} />
              Remover
            </InlineButton>
          </SettingRow>
        ))}

        {showForm && (
          <div
            style={{
              padding: 16,
              borderTop:
                webhooks.length > 0
                  ? "1px solid rgba(255,255,255,0.05)"
                  : "none",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <label style={LABEL_STYLE} htmlFor="wh-event">
                Evento
              </label>
              <select
                id="wh-event"
                value={draft.event}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, event: e.target.value }))
                }
                style={INPUT_STYLE}
              >
                {EVENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE} htmlFor="wh-url">
                URL
              </label>
              <input
                id="wh-url"
                type="text"
                placeholder="https://api.exemplo.com/hooks"
                value={draft.url}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, url: e.target.value }))
                }
                style={INPUT_STYLE}
              />
            </div>
            <div style={{ maxWidth: 200 }}>
              <label style={LABEL_STYLE} htmlFor="wh-retries">
                Retries
              </label>
              <input
                id="wh-retries"
                type="number"
                min={0}
                max={10}
                value={draft.retries}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    retries: Number(e.target.value),
                  }))
                }
                style={INPUT_STYLE}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <InlineButton variant="primary" onClick={handleCreate}>
                Criar
              </InlineButton>
              <InlineButton onClick={() => setShowForm(false)}>
                Cancelar
              </InlineButton>
            </div>
          </div>
        )}
      </SettingGroup>

      <SectionLabel>Logs de execução</SectionLabel>
      <ComingSoonSection
        icon={Network}
        label="Logs de entrega de webhooks"
        description="Histórico de status, payloads e tentativas — em breve."
      />
    </div>
  );
}
