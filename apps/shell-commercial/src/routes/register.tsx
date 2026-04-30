import { createRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { rootRoute } from "./__root";
import { useSessionStore } from "../stores/session";

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

interface CnpjPreview {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string;
  atividade_principal: string;
  municipio: string;
  uf: string;
}

function maskCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { drivers } = useSessionStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cnpjDisplay, setCnpjDisplay] = useState("");
  const [position, setPosition] = useState("");
  const [areaTrabalho, setAreaTrabalho] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [cnpjPreview, setCnpjPreview] = useState<CnpjPreview | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const cnpjLookupAbort = useRef<AbortController | null>(null);

  function handleCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCnpj(e.target.value);
    setCnpjDisplay(masked);
    setCnpjPreview(null);
    setCnpjError(null);

    const digits = masked.replace(/\D/g, "");
    if (digits.length === 14) {
      void lookupCnpj(digits);
    }
  }

  async function lookupCnpj(cnpj: string) {
    if (cnpjLookupAbort.current) cnpjLookupAbort.current.abort();
    cnpjLookupAbort.current = new AbortController();

    setCnpjLoading(true);
    setCnpjError(null);
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/cnpj-lookup?cnpj=${cnpj}`,
        {
          headers: { apikey: anonKey },
          signal: cnpjLookupAbort.current.signal,
        },
      );
      if (!res.ok) {
        setCnpjError("CNPJ não encontrado");
      } else {
        const data = (await res.json()) as CnpjPreview;
        setCnpjPreview(data);
      }
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setCnpjError("Erro ao consultar CNPJ");
      }
    } finally {
      setCnpjLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (drivers === null) {
      setError("Sistema ainda carregando. Aguarde.");
      return;
    }

    const cnpjDigits = cnpjDisplay.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      setError("CNPJ deve ter 14 dígitos");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (password.length < 8) {
      setError("Senha deve ter pelo menos 8 caracteres");
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Criar usuário auth
    const signUpResult = await drivers.auth.signUp(email, password);
    if (!signUpResult.ok) {
      setError(signUpResult.error.message);
      setLoading(false);
      return;
    }
    if (signUpResult.value.needsConfirmation) {
      setError(
        "Confirme seu e-mail antes de continuar. Verifique sua caixa de entrada.",
      );
      setLoading(false);
      return;
    }

    // 2. Obter token de acesso
    const sessionResult = await drivers.auth.getSession();
    if (!sessionResult.ok || sessionResult.value === null) {
      setError("Erro ao obter sessão. Tente fazer login e retornar.");
      setLoading(false);
      return;
    }
    const token = sessionResult.value.access_token;

    // 3. Registrar empresa
    const res = await fetch(`${supabaseUrl}/functions/v1/register-company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        email,
        fullName,
        phone,
        cnpj: cnpjDigits,
        position,
        areaTrabalho,
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Erro ao registrar empresa");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-semibold text-zinc-100">
            Cadastro recebido!
          </h1>
          <p className="text-sm text-zinc-400">
            Sua empresa foi registrada e está aguardando aprovação da equipe
            Aethereos. Você será notificado por e-mail quando sua conta for
            ativada.
          </p>
          <button
            onClick={() => void navigate({ to: "/login" })}
            className="mt-4 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Ir para login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            Criar conta Aethereos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Cadastre sua empresa para começar.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Nome completo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Nome completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Telefone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 (11) 99999-9999"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
            />
          </div>

          {/* CNPJ */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              CNPJ da empresa
            </label>
            <input
              type="text"
              required
              value={cnpjDisplay}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
            />

            {/* Preview card */}
            {cnpjLoading && (
              <p className="mt-1 text-xs text-zinc-500">Consultando CNPJ…</p>
            )}
            {cnpjError && (
              <p className="mt-1 text-xs text-red-400">{cnpjError}</p>
            )}
            {cnpjPreview && (
              <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-xs space-y-1">
                <p className="font-semibold text-zinc-100">
                  {cnpjPreview.razao_social}
                </p>
                {cnpjPreview.nome_fantasia && (
                  <p className="text-zinc-400">{cnpjPreview.nome_fantasia}</p>
                )}
                <div className="flex gap-4 text-zinc-500">
                  <span>
                    Situação:{" "}
                    <span
                      className={
                        cnpjPreview.situacao === "ATIVA"
                          ? "text-emerald-400"
                          : "text-yellow-400"
                      }
                    >
                      {cnpjPreview.situacao}
                    </span>
                  </span>
                  <span>
                    {cnpjPreview.municipio}/{cnpjPreview.uf}
                  </span>
                </div>
                <p className="text-zinc-500 truncate">
                  {cnpjPreview.atividade_principal}
                </p>
              </div>
            )}
          </div>

          {/* Cargo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Cargo
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="CEO, CTO, …"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Área
              </label>
              <input
                type="text"
                value={areaTrabalho}
                onChange={(e) => setAreaTrabalho(e.target.value)}
                placeholder="Tecnologia, …"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Registrando…" : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => void navigate({ to: "/login" })}
            className="text-violet-400 hover:underline"
          >
            Fazer login
          </button>
        </p>
      </div>
    </main>
  );
}
