/**
 * /staff — Painel Admin Multi-tenant
 *
 * Rota protegida por is_staff=true no JWT.
 * Staff vê TODAS as companies em modo operacional via Edge Functions service_role.
 * Todo acesso gera registro em kernel.staff_access_log + notificação ao owner.
 */
import { createRoute, useNavigate } from "@tanstack/react-router";
import { rootRoute } from "./__root.js";
import { useSessionStore } from "../stores/session.js";
import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanyOverview {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
  member_count: Array<{ count: number }>;
}

interface CompanyDetail {
  company: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  metrics: { member_count: number; events_last_7d: number };
  recent_access_log: Array<{
    id: string;
    staff_user_id: string;
    action: string;
    created_at: string;
  }>;
}

// ---------------------------------------------------------------------------
// StaffPage
// ---------------------------------------------------------------------------

function StaffPage() {
  const navigate = useNavigate();
  const { userId, email, isStaff, isPlatformAdmin, accessToken } =
    useSessionStore();
  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  useEffect(() => {
    if (userId === null) {
      void navigate({ to: "/login" });
      return;
    }
    if (!isStaff) {
      void navigate({ to: "/" });
    }
  }, [userId, isStaff, navigate]);

  const fetchCompanies = useCallback(async () => {
    if (accessToken === null || !isStaff) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/staff-list-companies`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (res.status === 403) {
        void navigate({ to: "/" });
        return;
      }
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Erro ao carregar companies");
        return;
      }
      const body = (await res.json()) as {
        data: CompanyOverview[];
        pagination: { total: number };
      };
      setCompanies(body.data ?? []);
      setTotalCompanies(body.pagination.total);
    } catch {
      setError("Falha de rede ao buscar companies");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isStaff, supabaseUrl, navigate]);

  useEffect(() => {
    if (userId !== null && isStaff) {
      void fetchCompanies();
    }
  }, [userId, isStaff, fetchCompanies]);

  const fetchDetail = useCallback(
    async (companyId: string) => {
      if (accessToken === null) return;
      setLoading(true);
      setDetail(null);
      setError(null);
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/staff-company-detail?company_id=${companyId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          setError(body.error ?? "Erro ao carregar company");
          return;
        }
        const body = (await res.json()) as CompanyDetail;
        setDetail(body);
      } catch {
        setError("Falha de rede ao buscar company");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, supabaseUrl],
  );

  const handleSelectCompany = useCallback(
    (companyId: string) => {
      setActiveCompanyId(companyId);
      void fetchDetail(companyId);
    },
    [fetchDetail],
  );

  const handleApproval = useCallback(
    async (companyId: string, action: "approve" | "reject") => {
      if (accessToken === null) return;
      setApprovalLoading(companyId + action);
      setError(null);
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/staff-approve-company`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ company_id: companyId, action }),
          },
        );
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          setError(body.error ?? "Erro ao processar aprovação");
          return;
        }
        void fetchCompanies();
      } catch {
        setError("Falha de rede ao processar aprovação");
      } finally {
        setApprovalLoading(null);
      }
    },
    [accessToken, supabaseUrl, fetchCompanies],
  );

  const planColor: Record<string, string> = {
    trial: "bg-zinc-800 text-zinc-400",
    starter: "bg-blue-900/30 text-blue-400",
    growth: "bg-violet-900/30 text-violet-400",
    enterprise: "bg-amber-900/30 text-amber-400",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-900/30 text-yellow-400",
    active: "bg-green-900/20 text-green-400",
    suspended: "bg-red-900/20 text-red-400",
    cancelled: "bg-zinc-900/20 text-zinc-600",
    deleted: "bg-zinc-900/20 text-zinc-600",
  };

  if (userId === null || !isStaff) return null;

  const memberCount = (c: CompanyOverview) => c.member_count[0]?.count ?? 0;

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
        {/* Sidebar */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
          <div className="p-3 pt-4">
            <p className="text-xs text-zinc-500">
              {totalCompanies} companies registradas
            </p>
            <p className="text-xs text-zinc-700 mt-1">
              Acesso registrado em kernel.staff_access_log.
            </p>
          </div>
          <nav className="flex flex-col gap-1 px-2 pb-4 overflow-y-auto">
            {loading && companies.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-600">Carregando...</p>
            )}
            {error !== null && (
              <p className="px-3 py-2 text-xs text-red-400">{error}</p>
            )}
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCompany(c.id)}
                className={[
                  "flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors",
                  activeCompanyId === c.id
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                ].join(" ")}
              >
                <span className="text-sm truncate">{c.name}</span>
                <span className="font-mono text-xs text-zinc-600 truncate">
                  {c.slug}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeCompanyId !== null ? (
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              <button
                type="button"
                onClick={() => {
                  setActiveCompanyId(null);
                  setDetail(null);
                }}
                className="mb-4 self-start text-xs text-zinc-500 hover:text-zinc-300"
              >
                ← Todas as companies
              </button>

              {loading && (
                <p className="text-xs text-zinc-600">Carregando detalhes...</p>
              )}
              {error !== null && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              {detail !== null && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-lg font-semibold text-zinc-100">
                      {detail.company.name}
                    </h2>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs",
                        statusColor[detail.company.status] ?? "",
                      ].join(" ")}
                    >
                      {detail.company.status}
                    </span>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs",
                        planColor[detail.company.plan] ?? "",
                      ].join(" ")}
                    >
                      {detail.company.plan}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: "ID", value: detail.company.id },
                      { label: "Slug", value: detail.company.slug },
                      {
                        label: "Membros",
                        value: String(detail.metrics.member_count),
                      },
                      {
                        label: "Eventos (7d)",
                        value: String(detail.metrics.events_last_7d),
                      },
                      {
                        label: "Criado em",
                        value: new Date(
                          detail.company.created_at,
                        ).toLocaleDateString("pt-BR"),
                      },
                      {
                        label: "Atualizado",
                        value: new Date(
                          detail.company.updated_at,
                        ).toLocaleString("pt-BR"),
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border border-zinc-800 p-3"
                      >
                        <p className="text-xs text-zinc-600">{item.label}</p>
                        <p className="text-sm font-mono text-zinc-300 mt-0.5 truncate">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {detail.recent_access_log.length > 0 && (
                    <div className="mt-2">
                      <h3 className="text-xs font-semibold text-zinc-500 mb-2">
                        Acessos staff recentes
                      </h3>
                      <div className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                        {detail.recent_access_log.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-3 px-4 py-2"
                          >
                            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                              <p className="text-xs text-zinc-300">
                                {entry.action}
                              </p>
                              <p className="font-mono text-xs text-zinc-600 truncate">
                                {entry.staff_user_id}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-zinc-700">
                              {new Date(entry.created_at).toLocaleString(
                                "pt-BR",
                                { dateStyle: "short", timeStyle: "short" },
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-zinc-800 pt-4 mt-4">
                    {detail.company.status === "active" ? (
                      <button
                        type="button"
                        className="rounded-md border border-red-700/50 px-3 py-1.5 text-xs text-red-400 hover:border-red-600 hover:text-red-300"
                        onClick={() => {
                          /* TODO: platform.tenant.suspended via scp-publish */
                        }}
                      >
                        Suspender company
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-md border border-green-700/50 px-3 py-1.5 text-xs text-green-400 hover:border-green-600"
                        onClick={() => {
                          /* TODO: platform.tenant.reactivated */
                        }}
                      >
                        Reativar company
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-zinc-700">
                    Ações aqui geram platform.staff.access e notificam o owner
                    (transparência obrigatória).
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Todas as Companies ({totalCompanies})
                </h2>
                <button
                  type="button"
                  onClick={() => void fetchCompanies()}
                  disabled={loading}
                  className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
                >
                  {loading ? "Carregando..." : "↻ Atualizar"}
                </button>
              </div>

              {error !== null && (
                <p className="mb-4 text-xs text-red-400">{error}</p>
              )}

              {/* Pending approvals section */}
              {isPlatformAdmin &&
                companies.filter((c) => c.status === "pending").length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-500">
                      Aguardando aprovação (
                      {companies.filter((c) => c.status === "pending").length})
                    </h3>
                    <div className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-yellow-800/40 bg-yellow-950/10">
                      {companies
                        .filter((c) => c.status === "pending")
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-4 px-4 py-3"
                          >
                            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                              <p className="text-sm font-medium text-zinc-100">
                                {c.name}
                              </p>
                              <p className="font-mono text-xs text-zinc-500">
                                {c.slug} · {memberCount(c)} membro(s)
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={
                                  approvalLoading === c.id + "approve" ||
                                  approvalLoading === c.id + "reject"
                                }
                                onClick={() =>
                                  void handleApproval(c.id, "approve")
                                }
                                className="rounded-md border border-green-700/50 px-3 py-1 text-xs text-green-400 hover:border-green-500 hover:text-green-300 disabled:opacity-40"
                              >
                                {approvalLoading === c.id + "approve"
                                  ? "…"
                                  : "Aprovar"}
                              </button>
                              <button
                                type="button"
                                disabled={
                                  approvalLoading === c.id + "approve" ||
                                  approvalLoading === c.id + "reject"
                                }
                                onClick={() =>
                                  void handleApproval(c.id, "reject")
                                }
                                className="rounded-md border border-red-800/50 px-3 py-1 text-xs text-red-400 hover:border-red-600 hover:text-red-300 disabled:opacity-40"
                              >
                                {approvalLoading === c.id + "reject"
                                  ? "…"
                                  : "Rejeitar"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {companies.length === 0 && !loading && (
                <p className="text-xs text-zinc-600">
                  Nenhuma company encontrada.
                </p>
              )}

              <div className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCompany(c.id)}
                    className="flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900"
                  >
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-medium text-zinc-100">
                        {c.name}
                      </p>
                      <p className="font-mono text-xs text-zinc-600">
                        {c.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-600">
                        {memberCount(c)} membros
                      </span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs",
                          planColor[c.plan] ?? "",
                        ].join(" ")}
                      >
                        {c.plan}
                      </span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs",
                          statusColor[c.status] ?? "",
                        ].join(" ")}
                      >
                        {c.status}
                      </span>
                    </div>
                  </button>
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
