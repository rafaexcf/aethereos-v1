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

  const PAGE_BG: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(135deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0.75) 100%), url('/login-bg.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  // Liquid Glass — parâmetros (mapeados para CSS):
  //   refração 100 → backdrop blur 50px (máximo perceptível)
  //   profundidade 100 → outer shadow forte + inset shadow definindo bordo
  //   dispersão 0 → sem chromatic aberration
  //   gelo 100 → backdrop saturate 180% + blur (frost máximo)
  //   splay 100 → inset shadow espalhada
  //   cor #000000 @ 20% → background rgba(0,0,0,0.20)
  //   (luz removida — sem highlight direcional)
  const CARD_STYLE: React.CSSProperties = {
    background: "rgba(0,0,0,0.20)",
    backdropFilter: "blur(50px) saturate(180%)",
    WebkitBackdropFilter: "blur(50px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 24,
    boxShadow: [
      // Inset shadow neutra para definir o bordo do vidro (depth)
      "inset 0 0 12px rgba(0,0,0,0.30)",
      "inset 0 -1px 0 rgba(0,0,0,0.40)",
      // Outer drop shadow (profundidade 100)
      "0 30px 60px -10px rgba(0,0,0,0.65)",
      "0 8px 24px -4px rgba(0,0,0,0.50)",
    ].join(", "),
  };
  const CARD_CLASSES = "w-full max-w-sm p-8";

  if (magicLinkSent) {
    return (
      <main
        className="flex min-h-screen items-center justify-center text-zinc-100"
        style={PAGE_BG}
      >
        <div className={`${CARD_CLASSES} space-y-4`} style={CARD_STYLE}>
          <h1 className="text-xl font-semibold">Verifique seu e-mail</h1>
          <p className="text-sm text-zinc-300">
            Enviamos um link de acesso para <strong>{email}</strong>. Clique no
            link para entrar.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center text-zinc-100"
      style={PAGE_BG}
    >
      <div className={`${CARD_CLASSES} space-y-6`} style={CARD_STYLE}>
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
