import { useState, useEffect } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useSessionStore } from "../../stores/session";
import { useDrivers } from "../../lib/drivers-context";

// ---------------------------------------------------------------------------
// Tipos de abas
// ---------------------------------------------------------------------------

type Tab = "perfil" | "empresa" | "plano" | "sistema" | "integracoes";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "perfil", label: "Perfil", icon: "👤" },
  { id: "empresa", label: "Empresa", icon: "🏢" },
  { id: "plano", label: "Plano", icon: "💳" },
  { id: "sistema", label: "Sistema", icon: "⚙️" },
  { id: "integracoes", label: "Integrações", icon: "🔌" },
];

// ---------------------------------------------------------------------------
// Aba Perfil
// ---------------------------------------------------------------------------

function TabPerfil() {
  const { email, userId } = useSessionStore();
  const drivers = useDrivers();
  const [name, setName] = useState("");
  const [lang, setLang] = useState("pt-BR");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega settings do usuário
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
    setSaving(true);
    if (drivers !== null && userId !== null) {
      const settings = [
        { scope: "user", scope_id: userId, key: "display_name", value: name },
        { scope: "user", scope_id: userId, key: "lang", value: lang },
        { scope: "user", scope_id: userId, key: "theme", value: theme },
      ];
      for (const s of settings) {
        await drivers.data
          .from("settings")
          .upsert(s, { onConflict: "scope,scope_id,key" });
      }
    }
    if (drivers !== null && userId !== null) {
      void drivers.scp.publishEvent("platform.settings.updated", {
        scope: "user",
        scope_id: userId,
        key: "profile",
        updated_by: userId,
      });
    }
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Nome de exibição
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: 13,
              padding: "8px 12px",
            }}
            className="focus:outline-none"
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            E-mail
          </label>
          <input
            type="email"
            value={email ?? ""}
            readOnly
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: 13,
              padding: "8px 12px",
              cursor: "not-allowed",
            }}
            className="focus:outline-none"
          />
          <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            E-mail vinculado ao IdP — altere via Supabase Auth
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Idioma
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: 13,
              padding: "8px 12px",
            }}
            className="focus:outline-none"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Tema
          </label>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                style={
                  theme === t
                    ? {
                        border: "1px solid var(--accent-border)",
                        background: "var(--accent-dim)",
                        color: "var(--accent-hover)",
                        borderRadius: "var(--radius-md)",
                        padding: "8px 16px",
                        fontSize: 12,
                        transition: "var(--transition-default)",
                      }
                    : {
                        border: "1px solid var(--border-default)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        borderRadius: "var(--radius-md)",
                        padding: "8px 16px",
                        fontSize: 12,
                        transition: "var(--transition-default)",
                      }
                }
                onMouseEnter={(e) => {
                  if (theme !== t) {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme !== t) {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                {t === "dark" ? "Escuro" : "Claro"}
              </button>
            ))}
          </div>
        </div>
        {userId !== null && (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontFamily: "monospace",
            }}
          >
            ID: {userId}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          background: "var(--accent)",
          borderRadius: "var(--radius-md)",
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: 500,
          color: "#fff",
          border: "none",
          transition: "var(--transition-default)",
          opacity: saving ? 0.5 : 1,
          cursor: saving ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!saving) e.currentTarget.style.background = "var(--accent-hover)";
        }}
        onMouseLeave={(e) => {
          if (!saving) e.currentTarget.style.background = "var(--accent)";
        }}
      >
        {saved ? "Salvo!" : saving ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Empresa
// ---------------------------------------------------------------------------

function TabEmpresa() {
  const { activeCompanyId, userId } = useSessionStore();
  const drivers = useDrivers();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega dados da empresa do banco
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
    setSaving(true);
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
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Nome da empresa
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: 13,
              padding: "8px 12px",
            }}
            className="focus:outline-none"
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: 13,
              padding: "8px 12px",
              fontFamily: "monospace",
            }}
            className="focus:outline-none"
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
          <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            aethereos.io/
            <span style={{ color: "var(--text-secondary)" }}>{slug}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            ID da empresa
          </label>
          <code
            style={{
              display: "block",
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              fontSize: 11,
              color: "var(--text-secondary)",
              fontFamily: "monospace",
            }}
          >
            {activeCompanyId ?? "não disponível"}
          </code>
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Link de convite
          </label>
          <div className="flex gap-2">
            <code
              style={{
                flex: 1,
                display: "block",
                background: "var(--bg-base)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              https://aethereos.io/join/{slug}/{crypto.randomUUID().slice(0, 8)}
            </code>
            <button
              type="button"
              onClick={() => {}}
              style={{
                background: "transparent",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                fontSize: 11,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "var(--transition-default)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-focus)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            >
              Copiar
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || drivers === null || activeCompanyId === null}
        style={{
          alignSelf: "flex-start",
          background: "var(--accent)",
          borderRadius: "var(--radius-md)",
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: 500,
          color: "#fff",
          border: "none",
          transition: "var(--transition-default)",
          opacity:
            saving || drivers === null || activeCompanyId === null ? 0.5 : 1,
          cursor:
            saving || drivers === null || activeCompanyId === null
              ? "not-allowed"
              : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!saving && drivers !== null && activeCompanyId !== null)
            e.currentTarget.style.background = "var(--accent-hover)";
        }}
        onMouseLeave={(e) => {
          if (!saving && drivers !== null && activeCompanyId !== null)
            e.currentTarget.style.background = "var(--accent)";
        }}
      >
        {saved ? "Salvo!" : saving ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Plano
// ---------------------------------------------------------------------------

function TabPlano() {
  const LIMITS = [
    { label: "Usuários", used: 3, limit: 10 },
    { label: "Armazenamento", used: 0.4, limit: 5, unit: "GB" },
    { label: "Chamadas LLM / mês", used: 0, limit: 100 },
    { label: "Eventos SCP / dia", used: 47, limit: 1000 },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div className="flex items-center gap-3">
        <span
          style={{
            borderRadius: 9999,
            background: "var(--accent-dim)",
            padding: "4px 12px",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--accent-hover)",
          }}
        >
          Plano Trial
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Expira em 30 dias
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {LIMITS.map((item) => {
          const pct = Math.min((item.used / item.limit) * 100, 100);
          return (
            <div key={item.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.label}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.used}
                  {item.unit !== undefined ? ` ${item.unit}` : ""} /{" "}
                  {item.limit}
                  {item.unit !== undefined ? ` ${item.unit}` : ""}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  width: "100%",
                  overflow: "hidden",
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    pct > 80
                      ? "bg-red-500"
                      : pct > 50
                        ? "bg-yellow-500"
                        : "bg-violet-500",
                  ].join(" ")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          padding: 16,
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Fazer upgrade
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Starter: R$99/mês — sem limites de usuários, 50GB armazenamento,
          10.000 chamadas LLM
        </p>
        <button
          type="button"
          style={{
            alignSelf: "flex-start",
            background: "var(--accent)",
            borderRadius: "var(--radius-md)",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            color: "#fff",
            border: "none",
            transition: "var(--transition-default)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
          }}
        >
          Fazer upgrade (disponível em breve)
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Sistema
// ---------------------------------------------------------------------------

function TabSistema() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div className="flex flex-col gap-4">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            padding: 16,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Exportar dados
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Download completo de todos os dados da empresa (LGPD Art. 18)
              </p>
            </div>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
                fontSize: 12,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "var(--transition-default)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-focus)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            >
              Solicitar export
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            padding: 16,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Status compliance
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                LGPD, SOC 2 (em preparação), dados residentes no Brasil
              </p>
            </div>
            <span
              style={{
                borderRadius: 9999,
                background: "rgba(16,185,129,0.14)",
                padding: "2px 8px",
                fontSize: 12,
                color: "#34d399",
              }}
            >
              Em conformidade
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(202,138,4,0.3)",
            padding: 16,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Modo manutenção
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Bloqueia acesso de usuários não-admin temporariamente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode((m) => !m)}
              style={{
                position: "relative",
                height: 24,
                width: 44,
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                transition: "var(--transition-default)",
                background: maintenanceMode
                  ? "#ca8a04"
                  : "rgba(255,255,255,0.12)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  height: 20,
                  width: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "var(--transition-default)",
                  transform: maintenanceMode
                    ? "translateX(20px)"
                    : "translateX(2px)",
                }}
              />
            </button>
          </div>
          {maintenanceMode && (
            <p className="text-xs text-yellow-400">
              ⚠️ Modo manutenção ativo — usuários verão mensagem de
              indisponibilidade
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Integrações
// ---------------------------------------------------------------------------

const INTEGRATIONS = [
  {
    name: "Slack",
    icon: "💬",
    status: "disponível" as const,
    description: "Notificações em canais Slack",
  },
  {
    name: "Email (SMTP)",
    icon: "📧",
    status: "disponível" as const,
    description: "Envio de e-mails transacionais",
  },
  {
    name: "ERP (SAP/TOTVS)",
    icon: "🏭",
    status: "em-breve" as const,
    description: "Sincronização com sistema ERP",
  },
  {
    name: "WhatsApp Business",
    icon: "📱",
    status: "em-breve" as const,
    description: "Atendimento via WhatsApp",
  },
  {
    name: "Stripe",
    icon: "💳",
    status: "ativo" as const,
    description: "Gateway de pagamentos",
  },
];

function TabIntegracoes() {
  return (
    <div className="flex flex-col gap-3 p-6">
      {INTEGRATIONS.map((intg) => (
        <div
          key={intg.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            padding: 16,
          }}
        >
          <span className="shrink-0 text-2xl">{intg.icon}</span>
          <div className="flex flex-1 flex-col gap-0.5">
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {intg.name}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {intg.description}
            </p>
          </div>
          <div>
            {intg.status === "ativo" ? (
              <span
                style={{
                  borderRadius: 9999,
                  background: "rgba(16,185,129,0.14)",
                  padding: "2px 8px",
                  fontSize: 12,
                  color: "#34d399",
                }}
              >
                Ativo
              </span>
            ) : intg.status === "disponível" ? (
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "4px 12px",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "var(--transition-default)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                }}
              >
                Configurar
              </button>
            ) : (
              <span
                style={{
                  borderRadius: 9999,
                  background: "var(--glass-bg)",
                  padding: "2px 8px",
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                }}
              >
                Em breve
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfiguracoesApp principal
// ---------------------------------------------------------------------------

export function ConfiguracoesApp() {
  const [activeTab, setActiveTab] = useState<Tab>("perfil");

  const tabContent: Record<Tab, React.ReactNode> = {
    perfil: <TabPerfil />,
    empresa: <TabEmpresa />,
    plano: <TabPlano />,
    sistema: <TabSistema />,
    integracoes: <TabIntegracoes />,
  };

  return (
    <AppShell
      title="Configurações"
      sidebar={
        <nav className="flex flex-col gap-1 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={
                activeTab === tab.id
                  ? {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 12px",
                      fontSize: 14,
                      background: "var(--accent-dim)",
                      color: "var(--accent-hover)",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "var(--transition-default)",
                    }
                  : {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 12px",
                      fontSize: 14,
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "var(--transition-default)",
                    }
              }
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = "var(--glass-bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      }
      sidebarWidth={180}
    >
      <div className="overflow-y-auto">{tabContent[activeTab]}</div>
    </AppShell>
  );
}
