"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SupabaseBrowserAuthDriver } from "@aethereos/drivers-supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  function makeDriver(): SupabaseBrowserAuthDriver {
    return new SupabaseBrowserAuthDriver({
      supabaseUrl: process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "",
      supabaseAnonKey: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "",
    });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await makeDriver().signIn(email, password);

    if (result.ok) {
      router.push("/app");
    } else {
      setError("E-mail ou senha inválidos.");
    }

    setLoading(false);
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Informe seu e-mail primeiro.");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await makeDriver().signInWithMagicLink(email);

    if (result.ok) {
      setMagicSent(true);
    } else {
      setError("Falha ao enviar link. Tente novamente.");
    }

    setLoading(false);
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <h2 className="text-xl font-semibold mb-2">Link enviado!</h2>
          <p className="text-[var(--muted-foreground)] text-sm">
            Verifique seu e-mail e clique no link para entrar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Entrar no Comércio Digital</h1>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] py-2 rounded-[var(--radius)] font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full border border-[var(--border)] py-2 rounded-[var(--radius)] text-sm hover:bg-[var(--muted)] transition-colors disabled:opacity-60"
          >
            Entrar com link por e-mail
          </button>
        </div>
      </div>
    </div>
  );
}
