import { createRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { rootRoute } from "./__root";
import { useSessionStore } from "../stores/session";

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { drivers } = useSessionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (drivers === null) return;
    setLoading(true);
    setError(null);

    const result = await drivers.auth.signUp(email, password);

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    if (result.value.needsConfirmation) {
      setConfirmationSent(true);
    } else {
      await navigate({ to: "/select-company" });
    }
    setLoading(false);
  }

  const PAGE_BG: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(135deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0.75) 100%), url('/signup-bg.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  // Liquid Glass — mesmos parâmetros do login (refração 100,
  // profundidade 100, gelo 100, splay 100, cor #000000 @ 20%).
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

  if (confirmationSent) {
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
            Confirme seu e-mail
          </h1>
          <p className="mt-4 text-sm text-zinc-300">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique no link para ativar sua conta.
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
        {/* Form column (LEFT — invertido em relação ao login) */}
        <section
          className="flex flex-col p-10 md:p-12"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Brand — idêntico ao TopBar da área logada */}
          <div className="flex items-center justify-center">
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              ÆTHEREOS
            </span>
          </div>

          {/* Heading */}
          <div className="mt-10 text-center">
            <h1 style={{ ...SERIF, fontSize: 38, lineHeight: 1.1 }}>
              Criar conta
            </h1>
            <p className="mt-2 text-xs text-zinc-300">
              Comece a usar o Aethereos em menos de 2 minutos
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="mt-7 space-y-4">
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
                Senha (mín. 8 caracteres)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-white/30 focus:bg-white/10"
              />
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
              {loading ? "Criando conta…" : "Criar conta"}
            </button>
          </form>

          <p className="mt-auto pt-8 text-center text-xs text-zinc-300">
            Já tem conta?{" "}
            <a
              href="/login"
              className="font-medium text-white underline-offset-2 hover:underline"
            >
              Entrar
            </a>
          </p>
        </section>

        {/* Hero column (RIGHT — invertido em relação ao login) */}
        <section className="relative flex flex-col justify-between p-10 md:p-12">
          {/* Top label with rule */}
          <div className="flex items-center justify-end gap-3">
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-zinc-300/40"
              style={{ maxWidth: 120 }}
            />
            <span
              className="text-[10px] font-semibold uppercase text-zinc-300"
              style={{ letterSpacing: "0.18em" }}
            >
              OS Empresarial · 2026
            </span>
          </div>

          {/* Headline + body */}
          <div className="mt-auto pt-16 text-right">
            <h2
              style={{
                ...SERIF,
                fontSize: "clamp(34px, 4.6vw, 54px)",
                lineHeight: 1.05,
                color: "#fafafa",
              }}
            >
              Sua empresa
              <br />
              começa
              <br />
              aqui
            </h2>
            <p className="mt-5 ml-auto max-w-sm text-sm leading-relaxed text-zinc-300">
              Crie sua conta gratuita e tenha acesso ao OS B2B no navegador.
              Multi-tenant, AI-native, sem instalação.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
