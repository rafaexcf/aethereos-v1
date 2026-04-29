import { useState } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useSessionStore } from "../../stores/session.js";

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
  const [name, setName] = useState("Usuário Demo");
  const [lang, setLang] = useState("pt-BR");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // TODO: persistir em kernel.settings scope=user + emitir platform.settings.updated
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Nome de exibição</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">E-mail</label>
          <input
            type="email"
            value={email ?? ""}
            readOnly
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-700">
            E-mail vinculado ao IdP — altere via Supabase Auth
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Idioma</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Tema</label>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={[
                  "rounded-md border px-4 py-2 text-xs transition-colors",
                  theme === t
                    ? "border-violet-500 bg-violet-600/20 text-violet-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500",
                ].join(" ")}
              >
                {t === "dark" ? "Escuro" : "Claro"}
              </button>
            ))}
          </div>
        </div>
        {userId !== null && (
          <p className="text-xs text-zinc-700 font-mono">ID: {userId}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleSave}
        className="self-start rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
      >
        {saved ? "Salvo!" : "Salvar"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Empresa
// ---------------------------------------------------------------------------

function TabEmpresa() {
  const { activeCompanyId } = useSessionStore();
  const [name, setName] = useState("Demo Company");
  const [slug, setSlug] = useState("demo-company");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // TODO: persistir em kernel.settings scope=company + emitir platform.settings.updated
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Nome da empresa</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <p className="text-xs text-zinc-700">
            aethereos.io/<span className="text-zinc-500">{slug}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">ID da empresa</label>
          <code className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500 font-mono">
            {activeCompanyId ?? "não disponível"}
          </code>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Link de convite</label>
          <div className="flex gap-2">
            <code className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500 font-mono truncate">
              https://aethereos.io/join/{slug}/{crypto.randomUUID().slice(0, 8)}
            </code>
            <button
              type="button"
              onClick={() => {}}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Copiar
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        className="self-start rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
      >
        {saved ? "Salvo!" : "Salvar"}
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
        <span className="rounded-full bg-violet-600/20 px-3 py-1 text-sm font-medium text-violet-300">
          Plano Trial
        </span>
        <span className="text-xs text-zinc-500">Expira em 30 dias</span>
      </div>

      <div className="flex flex-col gap-3">
        {LIMITS.map((item) => {
          const pct = Math.min((item.used / item.limit) * 100, 100);
          return (
            <div key={item.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{item.label}</span>
                <span className="text-zinc-500">
                  {item.used}
                  {item.unit !== undefined ? ` ${item.unit}` : ""} /{" "}
                  {item.limit}
                  {item.unit !== undefined ? ` ${item.unit}` : ""}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
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

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-700 p-4">
        <p className="text-sm font-medium text-zinc-100">Fazer upgrade</p>
        <p className="text-xs text-zinc-500">
          Starter: R$99/mês — sem limites de usuários, 50GB armazenamento,
          10.000 chamadas LLM
        </p>
        <button
          type="button"
          className="self-start rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
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
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">
                Exportar dados
              </p>
              <p className="text-xs text-zinc-500">
                Download completo de todos os dados da empresa (LGPD Art. 18)
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Solicitar export
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">
                Status compliance
              </p>
              <p className="text-xs text-zinc-500">
                LGPD, SOC 2 (em preparação), dados residentes no Brasil
              </p>
            </div>
            <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
              Em conformidade
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-yellow-800/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">
                Modo manutenção
              </p>
              <p className="text-xs text-zinc-500">
                Bloqueia acesso de usuários não-admin temporariamente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode((m) => !m)}
              className={[
                "relative h-6 w-11 rounded-full transition-colors",
                maintenanceMode ? "bg-yellow-600" : "bg-zinc-700",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  maintenanceMode ? "translate-x-5" : "translate-x-0.5",
                ].join(" ")}
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
          className="flex items-center gap-4 rounded-lg border border-zinc-800 p-4"
        >
          <span className="shrink-0 text-2xl">{intg.icon}</span>
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-zinc-100">{intg.name}</p>
            <p className="text-xs text-zinc-500">{intg.description}</p>
          </div>
          <div>
            {intg.status === "ativo" ? (
              <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                Ativo
              </span>
            ) : intg.status === "disponível" ? (
              <button
                type="button"
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500"
              >
                Configurar
              </button>
            ) : (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600">
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
              className={[
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                activeTab === tab.id
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
              ].join(" ")}
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
