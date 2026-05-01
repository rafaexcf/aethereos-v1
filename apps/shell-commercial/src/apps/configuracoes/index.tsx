import { useState, useEffect } from "react";
import {
  UserCircle,
  Building2,
  CreditCard,
  SlidersHorizontal,
  Plug,
  ChevronRight,
  Copy,
} from "lucide-react";
import { useSessionStore } from "../../stores/session";
import { useDrivers } from "../../lib/drivers-context";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = "perfil" | "empresa" | "plano" | "sistema" | "integracoes";

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof UserCircle;
  iconBg: string;
  iconColor: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ─── Nav data ─────────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Conta",
    items: [
      {
        id: "perfil",
        label: "Perfil",
        icon: UserCircle,
        iconBg: "rgba(99,102,241,0.22)",
        iconColor: "#818cf8",
      },
      {
        id: "empresa",
        label: "Empresa",
        icon: Building2,
        iconBg: "rgba(6,182,212,0.22)",
        iconColor: "#22d3ee",
      },
    ],
  },
  {
    label: "Assinatura",
    items: [
      {
        id: "plano",
        label: "Plano",
        icon: CreditCard,
        iconBg: "rgba(16,185,129,0.22)",
        iconColor: "#34d399",
      },
    ],
  },
  {
    label: "Avançado",
    items: [
      {
        id: "sistema",
        label: "Sistema",
        icon: SlidersHorizontal,
        iconBg: "rgba(100,116,139,0.22)",
        iconColor: "#94a3b8",
      },
      {
        id: "integracoes",
        label: "Integrações",
        icon: Plug,
        iconBg: "rgba(245,158,11,0.22)",
        iconColor: "#fbbf24",
      },
    ],
  },
];

const TAB_LABELS: Record<TabId, string> = {
  perfil: "Perfil",
  empresa: "Empresa",
  plano: "Plano",
  sistema: "Sistema",
  integracoes: "Integrações",
};

// ─── Design primitives ────────────────────────────────────────────────────────

function ContentHeader({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 20,
        fontWeight: 700,
        color: "var(--text-primary)",
        letterSpacing: "-0.03em",
        fontFamily: "var(--font-display)",
        marginBottom: 24,
      }}
    >
      {children}
    </h1>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function SettingRow({
  label,
  sublabel,
  last,
  children,
}: {
  label: string;
  sublabel?: string;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "11px 16px",
        gap: 12,
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
          {label}
        </span>
        {sublabel !== undefined && (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {sublabel}
          </span>
        )}
      </div>
      {children !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function SettingInput({
  value,
  onChange,
  readOnly,
  mono,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  mono?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        width: 220,
        background: readOnly
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.06)",
        border: readOnly
          ? "1px solid rgba(255,255,255,0.05)"
          : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "7px 11px",
        fontSize: mono ? 12 : 13,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        color: readOnly ? "var(--text-secondary)" : "var(--text-primary)",
        cursor: readOnly ? "not-allowed" : "text",
        outline: "none",
        transition: "border-color 120ms ease, box-shadow 120ms ease",
      }}
      onFocus={(e) => {
        if (!readOnly) {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = readOnly
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.10)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function SettingSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 220,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "7px 11px",
        fontSize: 13,
        color: "var(--text-primary)",
        outline: "none",
        cursor: "pointer",
        transition: "border-color 120ms ease",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#1e2530" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: on ? "#6366f1" : "rgba(255,255,255,0.15)",
        transition: "background 200ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#ffffff",
          transition: "transform 200ms ease",
          transform: on ? "translateX(20px)" : "translateX(2px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        }}
      />
    </button>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "success" | "warning" | "neutral";
  children: React.ReactNode;
}) {
  const styles = {
    success: { background: "rgba(16,185,129,0.14)", color: "#34d399" },
    warning: { background: "rgba(245,158,11,0.14)", color: "#fbbf24" },
    neutral: {
      background: "rgba(255,255,255,0.06)",
      color: "var(--text-tertiary)",
    },
  };

  return (
    <span
      style={{
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 500,
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}

function InlineButton({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
        border: danger
          ? "1px solid rgba(239,68,68,0.20)"
          : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 500,
        color: danger ? "#f87171" : "var(--text-primary)",
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.20)"
          : "rgba(255,255,255,0.11)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.12)"
          : "rgba(255,255,255,0.06)";
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "rgba(99,102,241,0.88)",
        borderRadius: 8,
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: 500,
        color: "#ffffff",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 120ms ease, opacity 120ms ease",
        alignSelf: "flex-start",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "#6366f1";
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          e.currentTarget.style.background = "rgba(99,102,241,0.88)";
      }}
    >
      {children}
    </button>
  );
}

function MonoCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        display: "block",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8,
        padding: "7px 11px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        color: "var(--text-secondary)",
        maxWidth: 280,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </code>
  );
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil() {
  const { email, userId } = useSessionStore();
  const drivers = useDrivers();
  const [name, setName] = useState("");
  const [lang, setLang] = useState("pt-BR");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  useEffect(() => {
    if (drivers === null || userId === null) return;
    drivers.data
      .from("settings")
      .select("key,value")
      .eq("scope", "user")
      .eq("scope_id", userId)
      .then(({ data }) => {
        if (data === null) return;
        for (const row of data as { key: string; value: unknown }[]) {
          if (row.key === "display_name" && typeof row.value === "string")
            setName(row.value);
          if (row.key === "lang" && typeof row.value === "string")
            setLang(row.value);
          if (
            row.key === "theme" &&
            (row.value === "dark" || row.value === "light")
          )
            setTheme(row.value);
        }
      });
  }, [drivers, userId]);

  async function handleSave() {
    setSaveState("saving");
    if (drivers !== null && userId !== null) {
      const rows = [
        { scope: "user", scope_id: userId, key: "display_name", value: name },
        { scope: "user", scope_id: userId, key: "lang", value: lang },
        { scope: "user", scope_id: userId, key: "theme", value: theme },
      ];
      for (const s of rows) {
        await drivers.data
          .from("settings")
          .upsert(s, { onConflict: "scope,scope_id,key" });
      }
      void drivers.scp.publishEvent("platform.settings.updated", {
        scope: "user",
        scope_id: userId,
        key: "profile",
        updated_by: userId,
      });
      if (theme === "light") document.documentElement.classList.remove("dark");
      else document.documentElement.classList.add("dark");
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader>Perfil</ContentHeader>

      <div>
        <SectionLabel>Informações pessoais</SectionLabel>
        <SettingGroup>
          <SettingRow label="Nome de exibição">
            <SettingInput value={name} onChange={setName} />
          </SettingRow>
          <SettingRow
            label="E-mail"
            sublabel="Vinculado ao IdP — altere via Supabase Auth"
          >
            <SettingInput value={email ?? ""} readOnly />
          </SettingRow>
          <SettingRow label="Idioma" last>
            <SettingSelect
              value={lang}
              onChange={setLang}
              options={[
                { value: "pt-BR", label: "Português (Brasil)" },
                { value: "en-US", label: "English (US)" },
                { value: "es-ES", label: "Español" },
              ]}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Aparência</SectionLabel>
        <SettingGroup>
          <SettingRow label="Tema" last>
            <div style={{ display: "flex", gap: 6 }}>
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "1px solid",
                    cursor: "pointer",
                    transition: "all 120ms ease",
                    background:
                      theme === t
                        ? "rgba(99,102,241,0.25)"
                        : "rgba(255,255,255,0.05)",
                    borderColor:
                      theme === t
                        ? "rgba(99,102,241,0.50)"
                        : "rgba(255,255,255,0.08)",
                    color: theme === t ? "#a5b4fc" : "var(--text-secondary)",
                  }}
                >
                  {t === "dark" ? "Escuro" : "Claro"}
                </button>
              ))}
            </div>
          </SettingRow>
        </SettingGroup>
      </div>

      {userId !== null && (
        <div>
          <SectionLabel>Identificação</SectionLabel>
          <SettingGroup>
            <SettingRow label="ID do usuário" last>
              <MonoCode>{userId}</MonoCode>
            </SettingRow>
          </SettingGroup>
        </div>
      )}

      <PrimaryButton
        onClick={() => void handleSave()}
        disabled={saveState !== "idle"}
      >
        {saveState === "saving"
          ? "Salvando…"
          : saveState === "saved"
            ? "Salvo!"
            : "Salvar alterações"}
      </PrimaryButton>
    </div>
  );
}

// ─── Tab: Empresa ─────────────────────────────────────────────────────────────

function TabEmpresa() {
  const { activeCompanyId, userId } = useSessionStore();
  const drivers = useDrivers();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    drivers.data
      .from("companies")
      .select("name,slug")
      .eq("id", activeCompanyId)
      .single()
      .then(({ data }) => {
        if (data === null) return;
        const row = data as { name: string; slug: string };
        setName(row.name);
        setSlug(row.slug);
      });
  }, [drivers, activeCompanyId]);

  async function handleSave() {
    if (drivers === null || activeCompanyId === null) return;
    setSaveState("saving");
    await drivers.data
      .from("companies")
      .update({ name, slug })
      .eq("id", activeCompanyId);
    if (userId !== null) {
      void drivers.scp.publishEvent("platform.settings.updated", {
        scope: "company",
        scope_id: activeCompanyId,
        key: "company_profile",
        updated_by: userId,
      });
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  const inviteLink = `https://aethereos.io/join/${slug}`;

  function handleCopy() {
    void navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader>Empresa</ContentHeader>

      <div>
        <SectionLabel>Perfil da empresa</SectionLabel>
        <SettingGroup>
          <SettingRow label="Nome da empresa">
            <SettingInput value={name} onChange={setName} />
          </SettingRow>
          <SettingRow
            label="Slug"
            sublabel={`aethereos.io/${slug || "…"}`}
            last
          >
            <SettingInput
              value={slug}
              onChange={(v) => setSlug(v.toLowerCase().replace(/\s+/g, "-"))}
              mono
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Identificação</SectionLabel>
        <SettingGroup>
          <SettingRow label="ID da empresa">
            <MonoCode>{activeCompanyId ?? "—"}</MonoCode>
          </SettingRow>
          <SettingRow label="Link de convite" last>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MonoCode>{inviteLink}</MonoCode>
              <InlineButton onClick={handleCopy}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Copy size={12} />
                  {copied ? "Copiado" : "Copiar"}
                </span>
              </InlineButton>
            </div>
          </SettingRow>
        </SettingGroup>
      </div>

      <PrimaryButton
        onClick={() => void handleSave()}
        disabled={
          saveState !== "idle" || drivers === null || activeCompanyId === null
        }
      >
        {saveState === "saving"
          ? "Salvando…"
          : saveState === "saved"
            ? "Salvo!"
            : "Salvar alterações"}
      </PrimaryButton>
    </div>
  );
}

// ─── Tab: Plano ───────────────────────────────────────────────────────────────

const USAGE_LIMITS = [
  { label: "Usuários", used: 3, limit: 10 },
  { label: "Armazenamento", used: 0.4, limit: 5, unit: "GB" },
  { label: "Chamadas LLM / mês", used: 0, limit: 100 },
  { label: "Eventos SCP / dia", used: 47, limit: 1000 },
];

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const fillColor = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#6366f1";

  return (
    <div
      style={{
        width: 120,
        height: 5,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 999,
          background: fillColor,
          transition: "width 400ms ease",
        }}
      />
    </div>
  );
}

function TabPlano() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader>Plano</ContentHeader>

      <div>
        <SectionLabel>Assinatura atual</SectionLabel>
        <SettingGroup>
          <SettingRow label="Tipo de plano">
            <Badge variant="warning">Trial</Badge>
          </SettingRow>
          <SettingRow label="Expira em" last>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              30 dias
            </span>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Uso de recursos</SectionLabel>
        <SettingGroup>
          {USAGE_LIMITS.map((item, i) => (
            <SettingRow
              key={item.label}
              label={item.label}
              last={i === USAGE_LIMITS.length - 1}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    minWidth: 60,
                    textAlign: "right",
                  }}
                >
                  {item.used}
                  {item.unit !== undefined ? ` ${item.unit}` : ""} /{" "}
                  {item.limit}
                  {item.unit !== undefined ? ` ${item.unit}` : ""}
                </span>
                <UsageBar used={item.used} limit={item.limit} />
              </div>
            </SettingRow>
          ))}
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Upgrade</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Plano Starter"
            sublabel="R$99/mês · usuários ilimitados · 50 GB · 10.000 chamadas LLM"
            last
          >
            <InlineButton onClick={() => {}}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                Fazer upgrade
                <ChevronRight size={12} />
              </span>
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Tab: Sistema ─────────────────────────────────────────────────────────────

function TabSistema() {
  const [maintenance, setMaintenance] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader>Sistema</ContentHeader>

      <div>
        <SectionLabel>Dados</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Exportar dados"
            sublabel="Download completo de todos os dados da empresa (LGPD Art. 18)"
            last
          >
            <InlineButton onClick={() => {}}>Solicitar export</InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Compliance</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Status de conformidade"
            sublabel="LGPD · SOC 2 em preparação · dados residentes no Brasil"
            last
          >
            <Badge variant="success">Em conformidade</Badge>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Controles</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Modo manutenção"
            sublabel={
              maintenance
                ? "Ativo — usuários verão mensagem de indisponibilidade"
                : "Bloqueia acesso de usuários não-admin temporariamente"
            }
            last
          >
            <Toggle
              on={maintenance}
              onToggle={() => setMaintenance((m) => !m)}
            />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Tab: Integrações ─────────────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    name: "Stripe",
    description: "Gateway de pagamentos",
    status: "ativo" as const,
    group: "Financeiro",
  },
  {
    name: "Slack",
    description: "Notificações em canais Slack",
    status: "disponivel" as const,
    group: "Comunicação",
  },
  {
    name: "Email (SMTP)",
    description: "Envio de e-mails transacionais",
    status: "disponivel" as const,
    group: "Comunicação",
  },
  {
    name: "WhatsApp Business",
    description: "Atendimento via WhatsApp",
    status: "em-breve" as const,
    group: "Comunicação",
  },
  {
    name: "ERP (SAP/TOTVS)",
    description: "Sincronização com sistema ERP",
    status: "em-breve" as const,
    group: "Infraestrutura",
  },
];

function TabIntegracoes() {
  const groups = Array.from(new Set(INTEGRATIONS.map((i) => i.group)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader>Integrações</ContentHeader>

      {groups.map((group) => {
        const items = INTEGRATIONS.filter((i) => i.group === group);
        return (
          <div key={group}>
            <SectionLabel>{group}</SectionLabel>
            <SettingGroup>
              {items.map((intg, idx) => (
                <SettingRow
                  key={intg.name}
                  label={intg.name}
                  sublabel={intg.description}
                  last={idx === items.length - 1}
                >
                  {intg.status === "ativo" && (
                    <Badge variant="success">Ativo</Badge>
                  )}
                  {intg.status === "disponivel" && (
                    <InlineButton onClick={() => {}}>Configurar</InlineButton>
                  )}
                  {intg.status === "em-breve" && (
                    <Badge variant="neutral">Em breve</Badge>
                  )}
                </SettingRow>
              ))}
            </SettingGroup>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  active,
  onSelect,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
}) {
  const { email } = useSessionStore();
  const { activeCompanyId } = useSessionStore();
  const initials = email ? email.slice(0, 2).toUpperCase() : "??";

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: "rgba(15,21,27,0.82)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* User card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 16,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.92)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initials}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email ?? "—"}
          </p>
          {activeCompanyId !== null && (
            <p
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 2,
              }}
            >
              {activeCompanyId.slice(0, 8)}…
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "8px 8px 16px" }}>
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div
            key={section.label}
            style={{ marginTop: sectionIdx === 0 ? 4 : 8 }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                padding: "10px 8px 4px",
              }}
            >
              {section.label}
            </p>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: isActive
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid transparent",
                    background: isActive
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition:
                      "background 120ms ease, color 120ms ease, border-color 120ms ease",
                    marginBottom: 2,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: item.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={15}
                      style={{ color: item.iconColor }}
                      strokeWidth={1.8}
                    />
                  </div>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const TAB_CONTENT: Record<TabId, React.ReactNode> = {
  perfil: <TabPerfil />,
  empresa: <TabEmpresa />,
  plano: <TabPlano />,
  sistema: <TabSistema />,
  integracoes: <TabIntegracoes />,
};

export function ConfiguracoesApp() {
  const [active, setActive] = useState<TabId>("perfil");

  return (
    <div
      data-ae="configuracoes-app"
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <Sidebar active={active} onSelect={setActive} />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 28,
        }}
      >
        <div style={{ maxWidth: 952, margin: "0 auto" }}>
          {TAB_CONTENT[active]}
        </div>
      </main>
    </div>
  );
}

export { TAB_LABELS };
