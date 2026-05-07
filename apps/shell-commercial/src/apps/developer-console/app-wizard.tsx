/**
 * Super Sprint F / MX245 — App Wizard 5 steps.
 *
 * 1. Identidade — nome, slug, descrição, categoria
 * 2. Aparência — ícone Lucide, cor, screenshots (URLs)
 * 3. Técnico — entry_mode, entry_url HTTPS, license, tags
 * 4. Permissões — scopes do SCOPE_CATALOG + justificativa para sensíveis
 *    (manifesto Zod-like validado inline)
 * 5. Monetização — modelo + price_cents (R17)
 *
 * Salva em kernel.app_submissions com status='draft'. Edit reuse
 * draft ou cria nova versão se já publicado (R12 versionamento).
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  Code,
  Lock,
  CreditCard,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import {
  SCOPE_CATALOG,
  type ScopeId,
  type ScopeDefinition,
} from "@aethereos/client";
import {
  APP_CATEGORIES,
  type AppSubmission,
  type DeveloperAccount,
  type EntryMode,
  type PricingModel,
} from "./types";

interface WizardProps {
  account: DeveloperAccount;
  editing: AppSubmission | null;
  onClose: () => void;
}

interface WizardState {
  app_slug: string;
  version: string;
  name: string;
  description: string;
  long_description: string;
  category: string;
  icon: string;
  color: string;
  screenshots: string[];
  entry_mode: EntryMode;
  entry_url: string;
  external_url: string;
  license: string;
  tags: string[];
  scopes: ScopeId[];
  scope_justifications: Partial<Record<ScopeId, string>>;
  pricing_model: PricingModel;
  price_cents: number;
}

const STEPS = [
  { id: 1, label: "Identidade", icon: Sparkles },
  { id: 2, label: "Aparência", icon: ImageIcon },
  { id: 3, label: "Técnico", icon: Code },
  { id: 4, label: "Permissões", icon: Lock },
  { id: 5, label: "Monetização", icon: CreditCard },
] as const;

const FIELD: React.CSSProperties = {
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

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
  display: "block",
};

const LICENSES = [
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "BSD-3-Clause",
  "proprietary",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function bumpVersion(v: string): string {
  const parts = v.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "1.0.0";
  return `${parts[0]}.${parts[1]}.${(parts[2] ?? 0) + 1}`;
}

function buildState(editing: AppSubmission | null): WizardState {
  if (editing === null) {
    return {
      app_slug: "",
      version: "1.0.0",
      name: "",
      description: "",
      long_description: "",
      category: "productivity",
      icon: "Box",
      color: "#6366f1",
      screenshots: [],
      entry_mode: "iframe",
      entry_url: "",
      external_url: "",
      license: "MIT",
      tags: [],
      scopes: ["auth.read"],
      scope_justifications: {},
      pricing_model: "free",
      price_cents: 0,
    };
  }
  const manifest = editing.manifest_json as {
    scopes?: ScopeId[];
    justifications?: Partial<Record<ScopeId, string>>;
  };
  return {
    app_slug: editing.app_slug,
    version: editing.version,
    name: editing.name,
    description: editing.description,
    long_description: editing.long_description,
    category: editing.category,
    icon: editing.icon,
    color: editing.color,
    screenshots: [...editing.screenshots],
    entry_mode: editing.entry_mode,
    entry_url: editing.entry_url,
    external_url: editing.external_url ?? "",
    license: editing.license,
    tags: [...editing.tags],
    scopes: manifest.scopes ?? ["auth.read"],
    scope_justifications: manifest.justifications ?? {},
    pricing_model: editing.pricing_model,
    price_cents: editing.price_cents,
  };
}

interface ValidationResult {
  ok: boolean;
  errors: Partial<Record<keyof WizardState, string>>;
}

function validateAll(s: WizardState): ValidationResult {
  const errors: Partial<Record<keyof WizardState, string>> = {};
  if (s.name.trim().length === 0) errors.name = "Nome obrigatório";
  if (s.app_slug.trim().length < 3)
    errors.app_slug = "Slug mínimo 3 caracteres";
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(s.app_slug))
    errors.app_slug = "Use letras minúsculas, números e hífens";
  if (s.description.trim().length === 0)
    errors.description = "Descrição curta obrigatória";
  if (s.description.length > 200) errors.description = "Máximo 200 caracteres";
  if (!APP_CATEGORIES.includes(s.category as never))
    errors.category = "Categoria inválida";
  if (!s.entry_url.trim().startsWith("https://"))
    errors.entry_url = "URL deve ser HTTPS";
  if (s.scopes.length === 0) errors.scopes = "Selecione ao menos auth.read";
  for (const scope of s.scopes) {
    const def = SCOPE_CATALOG[scope];
    if (def.sensitive) {
      const j = s.scope_justifications[scope];
      if (j === undefined || j.trim().length < 10) {
        errors.scope_justifications = `Justifique scope sensível ${scope} (10+ caracteres)`;
        break;
      }
    }
  }
  if (s.pricing_model !== "free" && s.price_cents <= 0) {
    errors.price_cents = "Preço obrigatório para planos não gratuitos";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function canAdvance(step: number, s: WizardState): boolean {
  if (step === 1)
    return (
      s.name.length > 0 &&
      /^[a-z0-9][a-z0-9-]{2,63}$/.test(s.app_slug) &&
      s.description.length > 0
    );
  if (step === 2) return true;
  if (step === 3) return s.entry_url.startsWith("https://");
  if (step === 4) {
    if (s.scopes.length === 0) return false;
    for (const sc of s.scopes) {
      if (SCOPE_CATALOG[sc].sensitive) {
        const j = s.scope_justifications[sc];
        if (j === undefined || j.trim().length < 10) return false;
      }
    }
    return true;
  }
  return true;
}

export function AppWizard({
  account,
  editing,
  onClose,
}: WizardProps): React.ReactElement {
  const drivers = useDrivers();
  const [state, setState] = useState<WizardState>(() => buildState(editing));
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Auto-slugify do nome enquanto slug está vazio.
  useEffect(() => {
    setState((prev) => {
      if (prev.app_slug !== "") return prev;
      const auto = slugify(prev.name);
      if (auto === "") return prev;
      return { ...prev, app_slug: auto };
    });
  }, [state.name]);

  const validation = useMemo(() => validateAll(state), [state]);
  const isPublished = editing?.status === "published";

  async function handleSave(): Promise<void> {
    if (drivers === null || saving) return;
    if (!validation.ok) {
      setError("Corrija os erros antes de salvar");
      return;
    }
    setSaving(true);
    setError(null);
    setFeedback(null);

    const payload = {
      developer_id: account.id,
      app_slug: state.app_slug,
      version: state.version,
      name: state.name.trim(),
      description: state.description.trim(),
      long_description: state.long_description.trim(),
      icon: state.icon,
      color: state.color,
      category: state.category,
      entry_mode: state.entry_mode,
      entry_url: state.entry_url.trim(),
      external_url: state.external_url.trim() || null,
      manifest_json: {
        slug: state.app_slug,
        name: state.name,
        version: state.version,
        scopes: state.scopes,
        justifications: state.scope_justifications,
      },
      screenshots: state.screenshots,
      tags: state.tags,
      pricing_model: state.pricing_model,
      price_cents: state.price_cents,
      currency: "BRL",
      license: state.license,
      status: "draft" as const,
    };

    try {
      if (editing === null || isPublished) {
        // Insert: novo app OU nova versão (clone com bump).
        const { error: err } = await drivers.data
          .from("app_submissions")
          .insert(payload);
        if (err !== null && err !== undefined) {
          throw new Error(
            typeof err === "object" && "message" in err
              ? String(err.message)
              : "Falha",
          );
        }
        setFeedback(
          isPublished
            ? `Nova versão ${state.version} criada como rascunho`
            : "App registrado como rascunho",
        );
      } else {
        const { error: err } = await drivers.data
          .from("app_submissions")
          .update(payload)
          .eq("id", editing.id);
        if (err !== null && err !== undefined) {
          throw new Error(
            typeof err === "object" && "message" in err
              ? String(err.message)
              : "Falha",
          );
        }
        setFeedback("Alterações salvas");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleVersionBump(): void {
    setState((s) => ({ ...s, version: bumpVersion(s.version) }));
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            padding: 6,
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {editing === null ? "Novo app" : `Editar ${editing.name}`}
            {isPublished && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fbbf24",
                  marginLeft: 10,
                }}
              >
                (criando nova versão)
              </span>
            )}
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              margin: "2px 0 0",
            }}
          >
            Passo {step}/{STEPS.length} — {STEPS[step - 1]?.label}
          </p>
        </div>
        {isPublished && (
          <button
            type="button"
            onClick={handleVersionBump}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            v{state.version} → bump
          </button>
        )}
      </header>

      <nav
        style={{
          padding: "10px 24px",
          display: "flex",
          gap: 6,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          const passed = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              style={{
                background: active ? "rgba(167,139,250,0.18)" : "transparent",
                border: "none",
                borderRadius: 8,
                color: active
                  ? "#a78bfa"
                  : passed
                    ? "#34d399"
                    : "var(--text-tertiary)",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                padding: "6px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon size={12} />
              {s.label}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 28px 160px",
          maxWidth: 720,
        }}
      >
        {step === 1 && (
          <Step1Identidade
            state={state}
            setState={setState}
            errors={validation.errors}
          />
        )}
        {step === 2 && <Step2Aparencia state={state} setState={setState} />}
        {step === 3 && (
          <Step3Tecnico
            state={state}
            setState={setState}
            errors={validation.errors}
          />
        )}
        {step === 4 && <Step4Permissoes state={state} setState={setState} />}
        {step === 5 && (
          <Step5Monetizacao
            state={state}
            setState={setState}
            errors={validation.errors}
          />
        )}
      </div>

      <footer
        style={{
          padding: "12px 24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {error !== null && (
          <span
            style={{
              fontSize: 12,
              color: "#f87171",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <AlertTriangle size={13} />
            {error}
          </span>
        )}
        {feedback !== null && error === null && (
          <span
            style={{
              fontSize: 12,
              color: "#34d399",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <CheckCircle2 size={13} />
            {feedback}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "8px 14px",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Anterior
          </button>
        )}
        {step < STEPS.length ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance(step, state)}
            style={{
              background: canAdvance(step, state)
                ? "#a78bfa"
                : "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              color: canAdvance(step, state)
                ? "#0b1015"
                : "var(--text-tertiary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: canAdvance(step, state) ? "pointer" : "default",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Próximo
            <ChevronRight size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!validation.ok || saving}
            style={{
              background:
                validation.ok && !saving ? "#10b981" : "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              color:
                validation.ok && !saving ? "#0b1015" : "var(--text-tertiary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: validation.ok && !saving ? "pointer" : "default",
            }}
          >
            {saving ? "Salvando…" : "Salvar rascunho"}
          </button>
        )}
      </footer>
    </div>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────

function Step1Identidade({
  state,
  setState,
  errors,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  errors: Partial<Record<keyof WizardState, string>>;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Nome do app *" error={errors.name}>
        <input
          type="text"
          style={FIELD}
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          placeholder="Meu Super App"
          maxLength={200}
        />
      </Field>
      <Field
        label="Slug *"
        hint="Identificador único na URL — minúsculas, números, hífen"
        error={errors.app_slug}
      >
        <input
          type="text"
          style={FIELD}
          value={state.app_slug}
          onChange={(e) =>
            setState((s) => ({ ...s, app_slug: e.target.value.toLowerCase() }))
          }
          placeholder="meu-super-app"
        />
      </Field>
      <Field
        label="Descrição curta *"
        hint={`${state.description.length}/200 caracteres`}
        error={errors.description}
      >
        <input
          type="text"
          style={FIELD}
          value={state.description}
          onChange={(e) =>
            setState((s) => ({ ...s, description: e.target.value }))
          }
          maxLength={200}
        />
      </Field>
      <Field
        label="Descrição longa (markdown)"
        hint={`${state.long_description.length}/2000`}
      >
        <textarea
          style={{ ...FIELD, minHeight: 120, resize: "vertical" }}
          value={state.long_description}
          onChange={(e) =>
            setState((s) => ({ ...s, long_description: e.target.value }))
          }
          maxLength={2000}
        />
      </Field>
      <Field label="Categoria *" error={errors.category}>
        <select
          style={FIELD}
          value={state.category}
          onChange={(e) =>
            setState((s) => ({ ...s, category: e.target.value }))
          }
        >
          {APP_CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ background: "#11161c" }}>
              {c}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Step2Aparencia({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field
        label="Ícone"
        hint="Nome de um ícone Lucide (ex: Box, Zap, Sparkles)"
      >
        <input
          type="text"
          style={FIELD}
          value={state.icon}
          onChange={(e) => setState((s) => ({ ...s, icon: e.target.value }))}
          placeholder="Box"
        />
      </Field>
      <Field label="Cor do tema (hex)">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="color"
            value={state.color}
            onChange={(e) => setState((s) => ({ ...s, color: e.target.value }))}
            style={{
              width: 56,
              height: 36,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          />
          <input
            type="text"
            style={{ ...FIELD, flex: 1 }}
            value={state.color}
            onChange={(e) => setState((s) => ({ ...s, color: e.target.value }))}
          />
        </div>
      </Field>
      <Field
        label="Screenshots"
        hint="Cole URLs https públicas, uma por linha (até 5)"
      >
        <textarea
          style={{
            ...FIELD,
            minHeight: 80,
            resize: "vertical",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
          }}
          value={state.screenshots.join("\n")}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              screenshots: e.target.value
                .split("\n")
                .map((u) => u.trim())
                .filter((u) => u.length > 0)
                .slice(0, 5),
            }))
          }
          placeholder="https://example.com/shot1.png"
        />
      </Field>
    </div>
  );
}

function Step3Tecnico({
  state,
  setState,
  errors,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  errors: Partial<Record<keyof WizardState, string>>;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Modo de entrada *">
        <div style={{ display: "flex", gap: 8 }}>
          {(["iframe", "weblink"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setState((s) => ({ ...s, entry_mode: m }))}
              style={{
                flex: 1,
                background:
                  state.entry_mode === m
                    ? "rgba(167,139,250,0.18)"
                    : "rgba(255,255,255,0.04)",
                border:
                  state.entry_mode === m
                    ? "1px solid rgba(167,139,250,0.40)"
                    : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                color:
                  state.entry_mode === m ? "#a78bfa" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                padding: "10px",
                cursor: "pointer",
              }}
            >
              {m === "iframe" ? "Iframe (embedado)" : "Weblink (abre nova aba)"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="URL do app * (HTTPS)" error={errors.entry_url}>
        <input
          type="url"
          style={FIELD}
          value={state.entry_url}
          onChange={(e) =>
            setState((s) => ({ ...s, entry_url: e.target.value }))
          }
          placeholder="https://app.example.com"
        />
      </Field>
      <Field
        label="URL externa (site/projeto)"
        hint="Opcional — link no perfil do app"
      >
        <input
          type="url"
          style={FIELD}
          value={state.external_url}
          onChange={(e) =>
            setState((s) => ({ ...s, external_url: e.target.value }))
          }
          placeholder="https://github.com/me/my-app"
        />
      </Field>
      <Field label="Licença">
        <select
          style={FIELD}
          value={state.license}
          onChange={(e) => setState((s) => ({ ...s, license: e.target.value }))}
        >
          {LICENSES.map((l) => (
            <option key={l} value={l} style={{ background: "#11161c" }}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tags" hint="Separadas por vírgula (até 10)">
        <input
          type="text"
          style={FIELD}
          value={state.tags.join(", ")}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0)
                .slice(0, 10),
            }))
          }
          placeholder="produtividade, kanban, tarefas"
        />
      </Field>
    </div>
  );
}

function Step4Permissoes({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}): React.ReactElement {
  const all = Object.values(SCOPE_CATALOG);
  function toggle(scope: ScopeId): void {
    if (scope === "auth.read") return; // Sempre incluído (R14)
    setState((s) => {
      const has = s.scopes.includes(scope);
      const next = has
        ? s.scopes.filter((x) => x !== scope)
        : [...s.scopes, scope];
      const justifications = { ...s.scope_justifications };
      if (has) delete justifications[scope];
      return { ...s, scopes: next, scope_justifications: justifications };
    });
  }
  function setJustification(scope: ScopeId, value: string): void {
    setState((s) => ({
      ...s,
      scope_justifications: { ...s.scope_justifications, [scope]: value },
    }));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        Selecione apenas os scopes que seu app precisa. Scopes sensíveis exigem
        justificativa (10+ caracteres).
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {all.map((def) => (
          <ScopeRow
            key={def.id}
            def={def}
            selected={state.scopes.includes(def.id)}
            justification={state.scope_justifications[def.id] ?? ""}
            onToggle={() => toggle(def.id)}
            onJustify={(v) => setJustification(def.id, v)}
          />
        ))}
      </div>
      <details>
        <summary
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            cursor: "pointer",
          }}
        >
          Manifesto gerado (preview)
        </summary>
        <pre
          style={{
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: 12,
            fontSize: 11,
            color: "var(--text-secondary)",
            overflow: "auto",
            margin: "8px 0 0",
          }}
        >
          {JSON.stringify(
            {
              slug: state.app_slug,
              name: state.name,
              version: state.version,
              scopes: state.scopes,
              justifications: state.scope_justifications,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}

function ScopeRow({
  def,
  selected,
  justification,
  onToggle,
  onJustify,
}: {
  def: ScopeDefinition;
  selected: boolean;
  justification: string;
  onToggle: () => void;
  onJustify: (v: string) => void;
}): React.ReactElement {
  const locked = def.id === "auth.read";
  return (
    <div
      style={{
        background: selected
          ? "rgba(167,139,250,0.06)"
          : "rgba(255,255,255,0.03)",
        border: selected
          ? "1px solid rgba(167,139,250,0.30)"
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          cursor: locked ? "default" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={locked}
          style={{ marginTop: 2 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {def.id}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              · {def.label}
            </span>
            {def.sensitive && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "#fbbf24",
                  background: "rgba(251,191,36,0.15)",
                  padding: "2px 6px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                }}
              >
                sensível
              </span>
            )}
            {locked && (
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                obrigatório
              </span>
            )}
          </div>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            {def.description}
          </p>
        </div>
      </label>
      {selected && def.sensitive && (
        <textarea
          value={justification}
          onChange={(e) => onJustify(e.target.value)}
          placeholder="Justifique por que seu app precisa deste scope (10+ caracteres)…"
          style={{ ...FIELD, minHeight: 56, resize: "vertical", fontSize: 12 }}
        />
      )}
    </div>
  );
}

function Step5Monetizacao({
  state,
  setState,
  errors,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  errors: Partial<Record<keyof WizardState, string>>;
}): React.ReactElement {
  const options: Array<{ id: PricingModel; label: string; sublabel: string }> =
    [
      { id: "free", label: "Gratuito", sublabel: "Sem cobrança ao usuário" },
      {
        id: "freemium",
        label: "Freemium",
        sublabel: "Grátis com features pagas in-app",
      },
      {
        id: "paid",
        label: "Pago (única vez)",
        sublabel: "Cobrança no momento da instalação",
      },
      {
        id: "subscription",
        label: "Assinatura",
        sublabel: "Mensalidade recorrente",
      },
    ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Modelo de monetização">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setState((s) => ({ ...s, pricing_model: o.id }))}
              style={{
                background:
                  state.pricing_model === o.id
                    ? "rgba(167,139,250,0.18)"
                    : "rgba(255,255,255,0.04)",
                border:
                  state.pricing_model === o.id
                    ? "1px solid rgba(167,139,250,0.40)"
                    : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                color:
                  state.pricing_model === o.id
                    ? "#a78bfa"
                    : "var(--text-secondary)",
                fontSize: 12,
                padding: "10px 12px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ fontWeight: 600 }}>{o.label}</span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {o.sublabel}
              </span>
            </button>
          ))}
        </div>
      </Field>
      {state.pricing_model !== "free" && (
        <Field label="Preço (R$)" error={errors.price_cents}>
          <input
            type="number"
            min={0}
            step={0.01}
            style={FIELD}
            value={(state.price_cents / 100).toFixed(2)}
            onChange={(e) => {
              const reais = parseFloat(e.target.value);
              const cents = Number.isFinite(reais)
                ? Math.round(reais * 100)
                : 0;
              setState((s) => ({ ...s, price_cents: cents }));
            }}
          />
        </Field>
      )}
      <div
        style={{
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.20)",
          borderRadius: 10,
          padding: 12,
          fontSize: 12,
          color: "var(--text-secondary)",
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <Sparkles
          size={13}
          color="#a78bfa"
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <span>
          <strong>Revenue share:</strong> Aethereos retém 30%, você recebe 70%
          do valor cobrado em apps pagos. Pagamento mensal via transferência
          bancária. Cadastre dados bancários após primeira venda.
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      {children}
      {error !== undefined ? (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <X size={11} /> {error}
        </p>
      ) : hint !== undefined ? (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
