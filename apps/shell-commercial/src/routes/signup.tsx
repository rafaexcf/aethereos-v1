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

  if (confirmationSent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="text-xl font-semibold">Confirme seu e-mail</h1>
          <p className="text-sm text-zinc-400">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
          <p className="mt-1 text-sm text-zinc-400">Comece com o Aethereos</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
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
              Senha (mín. 8 caracteres)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Já tem conta?{" "}
          <a href="/login" className="text-violet-400 hover:text-violet-300">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
