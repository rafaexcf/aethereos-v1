import { createRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { rootRoute } from "./__root";
import { useSessionStore } from "../stores/session";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { drivers, setAuthSession, setActiveCompany } = useSessionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (drivers === null) return;
    setLoading(true);
    setError(null);

    const result = await drivers.auth.signIn(email, password);

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const session = result.value;
    const claims = await drivers.auth.getCompanyClaims();

    setAuthSession({
      userId: session.user_id,
      email: session.email,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      companies: claims.companies,
      activeCompanyId: claims.activeCompanyId,
      isStaff: claims.isStaff,
      isPlatformAdmin: claims.isPlatformAdmin,
    });

    if (claims.activeCompanyId !== null) {
      setActiveCompany(claims.activeCompanyId);
      await navigate({ to: "/" });
    } else {
      await navigate({ to: "/select-company" });
    }

    setLoading(false);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (drivers === null) return;
    setLoading(true);
    setError(null);

    const result = await drivers.auth.signInWithMagicLink(email);

    if (!result.ok) {
      setError(result.error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  }

  if (magicLinkSent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="text-xl font-semibold">Verifique seu e-mail</h1>
          <p className="text-sm text-zinc-400">
            Enviamos um link de acesso para <strong>{email}</strong>. Clique no
            link para entrar.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aethereos</h1>
          <p className="mt-1 text-sm text-zinc-400">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>

          {error !== null && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="relative">
          <hr className="border-zinc-700" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 px-2 text-xs text-zinc-500">
            ou
          </span>
        </div>

        <form onSubmit={handleMagicLink}>
          <button
            type="submit"
            disabled={loading || email === ""}
            className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-50"
          >
            Entrar com link mágico
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Sem conta?{" "}
          <a href="/signup" className="text-violet-400 hover:text-violet-300">
            Criar conta
          </a>
        </p>
      </div>
    </main>
  );
}
