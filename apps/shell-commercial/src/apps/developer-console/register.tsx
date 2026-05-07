/**
 * Super Sprint F / MX244 — Tela de registro de developer.
 *
 * Form simples. INSERT em kernel.developer_accounts; api_key gerada
 * pelo banco (DEFAULT encode(gen_random_bytes(32), 'hex')).
 */

import * as React from "react";
import { useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

interface RegisterProps {
  onRegistered: () => void;
}

interface FormState {
  display_name: string;
  company_name: string;
  website: string;
  email: string;
  bio: string;
  accepted: boolean;
}

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "9px 12px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
  display: "block",
};

export function DeveloperRegister({
  onRegistered,
}: RegisterProps): React.ReactElement {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const email = useSessionStore((s) => s.email);

  const [form, setForm] = useState<FormState>({
    display_name: "",
    company_name: "",
    website: "",
    email: email ?? "",
    bio: "",
    accepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    form.display_name.trim().length >= 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.accepted &&
    !submitting;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || drivers === null || userId === null) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await drivers.data
      .from("developer_accounts")
      .insert({
        user_id: userId,
        display_name: form.display_name.trim(),
        company_name: form.company_name.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim().toLowerCase(),
        bio: form.bio.trim(),
        accepted_terms_at: new Date().toISOString(),
      });
    setSubmitting(false);
    if (err !== null && err !== undefined) {
      setError(
        typeof err === "object" && "message" in err
          ? String(err.message)
          : "Falha ao registrar",
      );
      return;
    }
    onRegistered();
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "32px 28px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 640,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "rgba(167,139,250,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={20} color="#a78bfa" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Aethereos Developer Program
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Publique apps na Magic Store e tenha 70% da receita.
          </p>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <label style={LABEL_STYLE} htmlFor="dev-name">
            Nome de exibição *
          </label>
          <input
            id="dev-name"
            type="text"
            style={FIELD_STYLE}
            value={form.display_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, display_name: e.target.value }))
            }
            placeholder="João Silva ou Acme Labs"
            maxLength={120}
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div>
            <label style={LABEL_STYLE} htmlFor="dev-company">
              Empresa
            </label>
            <input
              id="dev-company"
              type="text"
              style={FIELD_STYLE}
              value={form.company_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, company_name: e.target.value }))
              }
              placeholder="opcional"
            />
          </div>
          <div>
            <label style={LABEL_STYLE} htmlFor="dev-website">
              Website
            </label>
            <input
              id="dev-website"
              type="url"
              style={FIELD_STYLE}
              value={form.website}
              onChange={(e) =>
                setForm((f) => ({ ...f, website: e.target.value }))
              }
              placeholder="https://example.com"
            />
          </div>
        </div>
        <div>
          <label style={LABEL_STYLE} htmlFor="dev-email">
            E-mail de contato *
          </label>
          <input
            id="dev-email"
            type="email"
            style={FIELD_STYLE}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label style={LABEL_STYLE} htmlFor="dev-bio">
            Bio
          </label>
          <textarea
            id="dev-bio"
            style={{
              ...FIELD_STYLE,
              minHeight: 76,
              resize: "vertical",
              fontFamily: "inherit",
            }}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Conte sobre você ou sua empresa (opcional)"
            maxLength={500}
          />
        </div>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            fontSize: 13,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.accepted}
            onChange={(e) =>
              setForm((f) => ({ ...f, accepted: e.target.checked }))
            }
            style={{ marginTop: 2 }}
          />
          <span>
            Aceito os <strong>Termos de Desenvolvimento do Aethereos</strong> e
            a política de revisão de apps.
          </span>
        </label>

        {error !== null && (
          <div
            role="alert"
            style={{
              fontSize: 12,
              color: "#f87171",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          style={{
            background: canSubmit ? "#a78bfa" : "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: 8,
            color: canSubmit ? "#0b1015" : "var(--text-tertiary)",
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 16px",
            cursor: canSubmit ? "pointer" : "default",
          }}
        >
          {submitting ? "Registrando…" : "Registrar como developer"}
        </button>
      </div>
    </div>
  );
}
