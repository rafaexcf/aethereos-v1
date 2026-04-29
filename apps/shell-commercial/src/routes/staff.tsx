/**
 * /staff — Painel Admin Multi-tenant (M49)
 *
 * Rota protegida por role `staff` no JWT (separada de membership).
 * Staff vê TODAS as companies em modo operacional.
 * Todo acesso staff a dados de uma company gera platform.staff.access (TODO).
 * Perspectiva: staff global, não member da company.
 */
import { createRoute, useNavigate } from "@tanstack/react-router";
import { rootRoute } from "./__root.js";
import { useSessionStore } from "../stores/session.js";
import { useDrivers } from "../lib/drivers-context.js";
import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Demo data — substituir por query real quando Supabase conectado
// ---------------------------------------------------------------------------

interface CompanyOverview {
  id: string;
  name: string;
  slug: string;
  plan: "trial" | "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "pending";
  memberCount: number;
  createdAt: Date;
  lastActivity: Date;
}

const DEMO_COMPANIES: CompanyOverview[] = [
  {
    id: "comp-00000001",
    name: "Demo Company",
    slug: "demo-company",
    plan: "trial",
    status: "active",
    memberCount: 3,
    createdAt: new Date(Date.now() - 86_400_000 * 30),
    lastActivity: new Date(Date.now() - 60_000),
  },
  {
    id: "comp-00000002",
    name: "Acme Corp Brasil",
    slug: "acme-corp-br",
    plan: "starter",
    status: "active",
    memberCount: 12,
    createdAt: new Date(Date.now() - 86_400_000 * 90),
    lastActivity: new Date(Date.now() - 3_600_000),
  },
  {
    id: "comp-00000003",
    name: "Startup XYZ",
    slug: "startup-xyz",
    plan: "trial",
    status: "suspended",
    memberCount: 2,
    createdAt: new Date(Date.now() - 86_400_000 * 7),
    lastActivity: new Date(Date.now() - 86_400_000 * 2),
  },
];

interface StaffAccessLog {
  id: string;
  staffEmail: string;
  companyName: string;
  action: string;
  createdAt: Date;
}

const DEMO_STAFF_LOG: StaffAccessLog[] = [
  {
    id: "log-001",
    staffEmail: "ops@aethereos.io",
    companyName: "Startup XYZ",
    action: "company.viewed",
    createdAt: new Date(Date.now() - 1_800_000),
  },
  {
    id: "log-002",
    staffEmail: "ops@aethereos.io",
    companyName: "Startup XYZ",
    action: "company.suspended",
    createdAt: new Date(Date.now() - 1_700_000),
  },
];

// ---------------------------------------------------------------------------
// StaffPage
// ---------------------------------------------------------------------------

function StaffPage() {
  const navigate = useNavigate();
  const { userId, email, isStaff } = useSessionStore();
  const drivers = useDrivers();
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"companies" | "access_log">(
    "companies",
  );

  // Middleware: exige sessão autenticada + JWT is_staff=true
  useEffect(() => {
    if (userId === null) {
      void navigate({ to: "/login" });
      return;
    }
    if (!isStaff) {
      void navigate({ to: "/" });
    }
  }, [userId, isStaff, navigate]);

  // Registra acesso staff em kernel.staff_access_log + emite platform.staff.access via SCP
  const recordStaffAccess = useCallback(
    async (companyId: string, action: string) => {
      if (drivers === null || userId === null) return;
      await drivers.data
        .from("staff_access_log")
        .insert({ staff_user_id: userId, company_id: companyId, action });
      void drivers.scp.publishEvent("platform.staff.access", {
        staff_user_id: userId,
        company_id: companyId,
        action,
      });
    },
    [drivers, userId],
  );

  const activeCompany =
    activeCompanyId !== null
      ? DEMO_COMPANIES.find((c) => c.id === activeCompanyId)
      : null;

  const planColor: Record<string, string> = {
    trial: "bg-zinc-800 text-zinc-400",
    starter: "bg-blue-900/30 text-blue-400",
    professional: "bg-violet-900/30 text-violet-400",
    enterprise: "bg-amber-900/30 text-amber-400",
  };

  const statusColor: Record<string, string> = {
    active: "bg-green-900/20 text-green-400",
    suspended: "bg-red-900/20 text-red-400",
    pending: "bg-yellow-900/20 text-yellow-400",
  };

  if (userId === null || !isStaff) return null;

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-violet-400">Aethereos</span>
          <span className="rounded-md bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-400">
            STAFF
          </span>
          <span className="text-xs text-zinc-500">
            Painel Admin Multi-tenant
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">{email ?? userId}</span>
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
          >
            ← OS Principal
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — abas */}
        <aside className="flex w-48 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
          <nav className="flex flex-col gap-1 p-2 pt-4">
            {(
              [
                { id: "companies", label: "Companies", icon: "🏢" },
                { id: "access_log", label: "Acesso Staff", icon: "🔍" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveCompanyId(null);
                }}
                className={[
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                  activeTab === tab.id && activeCompanyId === null
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                ].join(" ")}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-4 border-t border-zinc-800 p-3">
            <p className="text-xs text-zinc-700">
              Acesso registrado em kernel.staff_access_log. Emissão de
              platform.staff.access via outbox no Sprint 7.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeCompany !== null && activeCompany !== undefined ? (
            /* Company detail */
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              <button
                type="button"
                onClick={() => setActiveCompanyId(null)}
                className="mb-4 self-start text-xs text-zinc-500 hover:text-zinc-300"
              >
                ← Voltar para companies
              </button>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-lg font-semibold text-zinc-100">
                  {activeCompany.name}
                </h2>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    statusColor[activeCompany.status] ?? "",
                  ].join(" ")}
                >
                  {activeCompany.status}
                </span>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    planColor[activeCompany.plan] ?? "",
                  ].join(" ")}
                >
                  {activeCompany.plan}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "ID", value: activeCompany.id },
                  { label: "Slug", value: activeCompany.slug },
                  {
                    label: "Membros",
                    value: String(activeCompany.memberCount),
                  },
                  {
                    label: "Criado em",
                    value: activeCompany.createdAt.toLocaleDateString("pt-BR"),
                  },
                  {
                    label: "Última atividade",
                    value: activeCompany.lastActivity.toLocaleString("pt-BR"),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-zinc-800 p-3"
                  >
                    <p className="text-xs text-zinc-600">{item.label}</p>
                    <p className="text-sm font-mono text-zinc-300 mt-0.5">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t border-zinc-800 pt-4">
                {activeCompany.status === "active" ? (
                  <button
                    type="button"
                    className="rounded-md border border-red-700/50 px-3 py-1.5 text-xs text-red-400 hover:border-red-600 hover:text-red-300"
                    onClick={() => {
                      /* TODO: emitir platform.tenant.suspended */
                    }}
                  >
                    Suspender company
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-md border border-green-700/50 px-3 py-1.5 text-xs text-green-400 hover:border-green-600"
                    onClick={() => {
                      /* TODO: emitir reativação */
                    }}
                  >
                    Reativar company
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500"
                  onClick={() => {
                    /* TODO: emitir platform.staff.access */
                  }}
                >
                  Ver audit log desta company
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-700">
                ⚠️ Ações de staff aqui geram platform.staff.access e notificam o
                owner da company (transparência obrigatória).
              </p>
            </div>
          ) : activeTab === "companies" ? (
            /* Companies list */
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Todas as Companies ({DEMO_COMPANIES.length})
                </h2>
                <p className="text-xs text-zinc-600">
                  Demo — produção conecta via kernel.companies + RLS
                  service_role
                </p>
              </div>

              <div className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                {DEMO_COMPANIES.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      setActiveCompanyId(company.id);
                      void recordStaffAccess(company.id, "company.viewed");
                    }}
                    className="flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900"
                  >
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-medium text-zinc-100">
                        {company.name}
                      </p>
                      <p className="font-mono text-xs text-zinc-600">
                        {company.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-600">
                        {company.memberCount} membros
                      </span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs",
                          planColor[company.plan] ?? "",
                        ].join(" ")}
                      >
                        {company.plan}
                      </span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs",
                          statusColor[company.status] ?? "",
                        ].join(" ")}
                      >
                        {company.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Staff access log */
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Log de Acesso Staff
                </h2>
                <p className="text-xs text-zinc-600 mt-1">
                  Todo acesso staff gera platform.staff.access + notificação ao
                  owner. Imutável.
                </p>
              </div>

              <div className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                {DEMO_STAFF_LOG.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="shrink-0 text-base">🔍</span>
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <p className="text-xs text-zinc-200">{entry.action}</p>
                      <p className="text-xs text-zinc-600">
                        {entry.staffEmail} → {entry.companyName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-700">
                      {entry.createdAt.toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export const staffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff",
  component: StaffPage,
});
