import { createRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { rootRoute } from "./__root";
import { useSessionStore } from "../stores/session";

export const selectCompanyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/select-company",
  component: SelectCompanyPage,
});

function SelectCompanyPage() {
  const navigate = useNavigate();
  const { drivers, companies, setActiveCompany } = useSessionStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelect(companyId: string) {
    setActiveCompany(companyId);
    if (drivers !== null) {
      drivers.auth.withCompanyContext(companyId);
    }
    await navigate({ to: "/" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (drivers === null) return;
    setLoading(true);
    setError(null);

    // Chama a Edge Function create_company (implementada em M22)
    const session = await drivers.auth.getSession();
    if (!session.ok || session.value === null) {
      setError("Sessão expirada. Faça login novamente.");
      setLoading(false);
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-company`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.value.access_token}`,
        },
        body: JSON.stringify({ name: newName, slug: newSlug }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Erro ao criar empresa");
      setLoading(false);
      return;
    }

    const { companyId } = (await response.json()) as { companyId: string };

    // Refresh session to get updated JWT claims with new company
    const refreshed = await drivers.auth.refreshSession();
    if (refreshed.ok) {
      const claims = await drivers.auth.getCompanyClaims();
      useSessionStore.getState().setAuthSession({
        userId: refreshed.value.user_id,
        email: refreshed.value.email,
        accessToken: refreshed.value.access_token,
        refreshToken: refreshed.value.refresh_token,
        companies: claims.companies,
        activeCompanyId: companyId,
        isStaff: claims.isStaff,
      });
    }

    setActiveCompany(companyId);
    drivers.auth.withCompanyContext(companyId);
    await navigate({ to: "/" });
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Escolha sua empresa
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Selecione uma empresa ou crie uma nova
          </p>
        </div>

        {companies.length > 0 && (
          <ul className="space-y-2">
            {companies.map((companyId) => (
              <li key={companyId}>
                <button
                  onClick={() => handleSelect(companyId)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-left text-sm transition-colors hover:border-violet-500"
                >
                  <span className="font-mono text-xs text-zinc-400">
                    {companyId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="w-full rounded-lg border border-dashed border-zinc-600 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-violet-500 hover:text-zinc-200"
          >
            + Criar nova empresa
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="name">
                Nome da empresa
              </label>
              <input
                id="name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Minha Empresa Ltda"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="slug">
                Slug (identificador único)
              </label>
              <input
                id="slug"
                type="text"
                value={newSlug}
                onChange={(e) =>
                  setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                }
                placeholder="minha-empresa"
                pattern="[a-z0-9-]{3,63}"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm outline-none focus:border-violet-500"
              />
              <p className="text-xs text-zinc-500">
                Apenas letras minúsculas, números e hífens (3-63 caracteres)
              </p>
            </div>

            {error !== null && (
              <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {loading ? "Criando..." : "Criar empresa"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
