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

  // Liquid Glass — refração 100, profundidade 100, dispersão 0,
  // gelo 100, splay 100, cor #000000 @ 20%, sem luz direcional.
  const GLASS_STYLE: React.CSSProperties = {
    background: "rgba(0,0,0,0.20)",
    backdropFilter: "blur(50px) saturate(180%)",
    WebkitBackdropFilter: "blur(50px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: [
      "inset 0 0 12px rgba(0,0,0,0.30)",
      "inset 0 -1px 0 rgba(0,0,0,0.40)",
      "0 30px 60px -10px rgba(0,0,0,0.65)",
      "0 8px 24px -4px rgba(0,0,0,0.50)",
    ].join(", "),
  };

  const SERIF: React.CSSProperties = {
    fontFamily: '"DM Serif Display", Georgia, serif',
    fontWeight: 400,
    letterSpacing: "-0.02em",
  };

  if (magicLinkSent) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-6 text-zinc-100"
        style={PAGE_BG}
      >
        <div
          className="w-full max-w-md p-10"
          style={{ ...GLASS_STYLE, borderRadius: 24 }}
        >
          <h1 style={{ ...SERIF, fontSize: 36, lineHeight: 1.1 }}>
            Verifique seu e-mail
          </h1>
          <p className="mt-4 text-sm text-zinc-300">
            Enviamos um link de acesso para <strong>{email}</strong>. Clique no
            link para entrar.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-6 text-zinc-100"
      style={PAGE_BG}
    >
      <div
        className="grid w-full max-w-5xl overflow-hidden md:grid-cols-2"
        style={{ ...GLASS_STYLE, borderRadius: 28, minHeight: 560 }}
      >
        {/* Hero column */}
        <section
          className="relative flex flex-col justify-between p-10 md:p-12"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Top label with rule */}
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] font-semibold uppercase text-zinc-300"
              style={{ letterSpacing: "0.18em" }}
            >
              OS Empresarial · 2026
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-zinc-300/40"
              style={{ maxWidth: 120 }}
            />
          </div>

          {/* Headline + body */}
          <div className="mt-auto pt-16">
            <h2
              style={{
                ...SERIF,
                fontSize: "clamp(34px, 4.6vw, 54px)",
                lineHeight: 1.05,
                color: "#fafafa",
              }}
            >
              Construa
              <br />
              tudo o que
              <br />
              sua empresa precisa
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-zinc-300">
              Aethereos é o sistema operacional B2B no navegador. Multi-tenant,
              AI-native, com tudo que sua operação precisa em um único lugar.
            </p>
          </div>
        </section>

        {/* Form column */}
        <section className="flex flex-col p-10 md:p-12">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-5 w-5 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #c4b5fd 0%, #6366f1 60%, #312e81 100%)",
              }}
            />
            <span className="text-sm font-semibold tracking-tight">
              Aethereos
            </span>
          </div>

          {/* Welcome heading */}
          <div className="mt-10 text-center">
            <h1 style={{ ...SERIF, fontSize: 38, lineHeight: 1.1 }}>
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-xs text-zinc-300">
              Entre com seu e-mail e senha para acessar sua conta
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium text-zinc-200"
                htmlFor="email"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-white/30 focus:bg-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium text-zinc-200"
                htmlFor="password"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-white/30 focus:bg-white/10"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/5"
                />
                Lembrar de mim
              </label>
              <a
                href="/forgot"
                className="text-zinc-300 transition-colors hover:text-white"
              >
                Esqueceu a senha?
              </a>
            </div>

            {error !== null && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md px-4 py-3 text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{
                background: "#140086",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.10) inset, 0 8px 24px rgba(20,0,134,0.45)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1d00b3";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#140086";
              }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          {/* Magic link */}
          <form onSubmit={handleMagicLink} className="mt-3">
            <button
              type="submit"
              disabled={loading || email === ""}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <SparkleGlyph />
              Entrar com link mágico
            </button>
          </form>

          {/* Sign up */}
          <p className="mt-auto pt-8 text-center text-xs text-zinc-300">
            Sem conta?{" "}
            <a
              href="/signup"
              className="font-medium text-white underline-offset-2 hover:underline"
            >
              Criar conta
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

function SparkleGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
