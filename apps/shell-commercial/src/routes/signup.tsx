import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Search,
  User,
  X,
} from "lucide-react";
import { rootRoute } from "./__root";
import { useSessionStore } from "../stores/session";

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});

// ─── Constantes ─────────────────────────────────────────────────────────────

const DDIS: ReadonlyArray<{ code: string; iso: string; label: string }> = [
  { code: "+55", iso: "br", label: "Brasil" },
  { code: "+1", iso: "us", label: "EUA" },
  { code: "+351", iso: "pt", label: "Portugal" },
  { code: "+54", iso: "ar", label: "Argentina" },
  { code: "+56", iso: "cl", label: "Chile" },
  { code: "+57", iso: "co", label: "Colômbia" },
  { code: "+52", iso: "mx", label: "México" },
  { code: "+598", iso: "uy", label: "Uruguai" },
  { code: "+595", iso: "py", label: "Paraguai" },
  { code: "+591", iso: "bo", label: "Bolívia" },
  { code: "+51", iso: "pe", label: "Peru" },
  { code: "+34", iso: "es", label: "Espanha" },
  { code: "+33", iso: "fr", label: "França" },
  { code: "+49", iso: "de", label: "Alemanha" },
  { code: "+39", iso: "it", label: "Itália" },
  { code: "+44", iso: "gb", label: "Reino Unido" },
  { code: "+81", iso: "jp", label: "Japão" },
  { code: "+86", iso: "cn", label: "China" },
];

const CARGOS = [
  "CEO/Presidente",
  "CFO",
  "COO",
  "CTO",
  "CMO",
  "Diretor(a)",
  "Sócio(a)/Proprietário(a)",
  "Conselheiro(a)",
  "Gerente",
  "Coordenador(a)",
  "Supervisor(a)",
  "Head/Líder de Área",
  "Especialista",
  "Consultor(a)",
  "Analista Sênior",
  "Analista Pleno",
  "Analista Júnior",
  "Assistente",
  "Auxiliar",
  "Estagiário(a)",
  "Técnico(a)",
  "Operador(a)",
  "Vendedor(a)",
  "Comprador(a)",
  "Representante Comercial",
  "Outro",
] as const;

const AREAS = [
  "Comercial/Vendas",
  "Compras/Suprimentos",
  "Financeiro",
  "Contabilidade",
  "Fiscal/Tributário",
  "Administrativo",
  "RH",
  "Marketing",
  "TI",
  "Logística/Expedição",
  "Produção/Manufatura",
  "Qualidade",
  "Engenharia",
  "Jurídico",
  "Atendimento ao Cliente/SAC",
  "Comércio Exterior/Trade",
  "PMO/Projetos",
  "Diretoria/Presidência",
  "Operações",
  "P&D",
  "Outro",
] as const;

const STEPS = [
  { id: 1, label: "Dados Pessoais", icon: User },
  { id: 2, label: "Empresa", icon: Building2 },
  { id: 3, label: "Função", icon: Briefcase },
  { id: 4, label: "Segurança", icon: Lock },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCNPJ(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCelular(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 3) return `(${d.slice(0, 2)})${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)})${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)})${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

interface CnpjPreview {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string;
  atividade_principal?: string;
  municipio: string;
  uf: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
}

// ─── Page ───────────────────────────────────────────────────────────────────

function SignupPage() {
  const navigate = useNavigate();
  const { drivers } = useSessionStore();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDdi, setPhoneDdi] = useState("+55");
  const [phone, setPhone] = useState("");

  // Step 2
  const [cnpj, setCnpj] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjData, setCnpjData] = useState<CnpjPreview | null>(null);
  const [cnpjApproved, setCnpjApproved] = useState(false);
  const cnpjAbort = useRef<AbortController | null>(null);

  // Step 3
  const [position, setPosition] = useState("");
  const [area, setArea] = useState("");

  // Step 4
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string;
  const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string;

  const PAGE_BG: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(135deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0.75) 100%), url('/signup-bg.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  const GLASS: React.CSSProperties = {
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

  // ── Validação por passo ──────────────────────────────────────────────────
  function validateStep(n: number): string | null {
    if (n === 1) {
      if (fullName.trim().length === 0) return "Informe seu nome completo";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido";
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 10) return "Celular inválido";
    }
    if (n === 2) {
      const d = cnpj.replace(/\D/g, "");
      if (d.length !== 14) return "CNPJ deve ter 14 dígitos";
      if (!cnpjApproved) return "Confirme a empresa antes de avançar";
    }
    if (n === 3) {
      if (position === "") return "Selecione um cargo";
      if (area === "") return "Selecione uma área";
    }
    if (n === 4) {
      if (password.length < 8) return "Senha deve ter ao menos 8 caracteres";
      if (password !== confirmPassword) return "As senhas não conferem";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err !== null) {
      setError(err);
      return;
    }
    setError(null);
    setDirection(1);
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setError(null);
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  }

  // ── CNPJ lookup ──────────────────────────────────────────────────────────
  async function lookupCnpj() {
    const d = cnpj.replace(/\D/g, "");
    if (d.length !== 14) return;
    if (cnpjAbort.current !== null) cnpjAbort.current.abort();
    cnpjAbort.current = new AbortController();
    setCnpjLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/cnpj-lookup?cnpj=${d}`,
        {
          headers: { apikey: anonKey },
          signal: cnpjAbort.current.signal,
        },
      );
      if (!res.ok) {
        setError("CNPJ não encontrado");
        setCnpjData(null);
      } else {
        const data = (await res.json()) as CnpjPreview;
        setCnpjData(data);
        setCnpjApproved(false);
      }
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setError("Erro ao consultar CNPJ");
      }
    } finally {
      setCnpjLoading(false);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (drivers === null) {
      setError("Sistema ainda carregando. Aguarde.");
      return;
    }
    const err = validateStep(4);
    if (err !== null) {
      setError(err);
      return;
    }

    setLoading(true);
    setError(null);

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

    const sessionResult = await drivers.auth.getSession();
    if (!sessionResult.ok || sessionResult.value === null) {
      setError("Erro ao obter sessão. Tente fazer login.");
      setLoading(false);
      return;
    }
    const token = sessionResult.value.access_token;

    const phoneDigits = phone.replace(/\D/g, "");
    const fullPhone = `${phoneDdi}${phoneDigits}`;
    const cnpjDigits = cnpj.replace(/\D/g, "");

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
        phone: fullPhone,
        cnpj: cnpjDigits,
        position,
        areaTrabalho: area,
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Erro ao registrar empresa");
      setLoading(false);
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setSuccessMessage(data.message ?? null);
    setSuccess(true);
    setLoading(false);
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (success) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-6 text-zinc-100"
        style={PAGE_BG}
      >
        <div
          className="w-full max-w-md p-10 text-center animate-in fade-in zoom-in-95 duration-500"
          style={{ ...GLASS, borderRadius: 24 }}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 size={48} className="text-green-400" />
          </div>
          <h2
            style={{ ...SERIF, fontSize: 28, lineHeight: 1.1 }}
            className="mt-6 text-green-400"
          >
            Cadastro efetuado com sucesso!
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            {successMessage ??
              "Em breve nosso time de especialistas entrará em contato para validar seus dados e manter nossa comunidade segura."}
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-medium text-white transition-all"
            style={{
              background: "#140086",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.10) inset, 0 8px 24px rgba(20,0,134,0.45)",
            }}
          >
            Voltar ao Login
          </Link>
        </div>
      </main>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────
  return (
    <main
      className="flex min-h-screen items-center justify-center p-6 text-zinc-100"
      style={PAGE_BG}
    >
      <div
        className="grid w-full max-w-5xl overflow-hidden md:grid-cols-2"
        style={{ ...GLASS, borderRadius: 28, minHeight: 640 }}
      >
        {/* Form column */}
        <section
          className="flex flex-col p-8 md:p-10"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="text-center">
            <h2 style={{ ...SERIF, fontSize: 32, lineHeight: 1.1 }}>
              Criar Conta
            </h2>
            <p className="mt-1 text-xs text-zinc-300">
              Preencha os dados para solicitar acesso
            </p>
          </div>

          {/* Step indicator */}
          <div className="mt-6 mb-6 flex items-center justify-center">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const completed = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300"
                    style={{
                      borderColor:
                        completed || active
                          ? "#140086"
                          : "rgba(255,255,255,0.15)",
                      background: active
                        ? "#140086"
                        : completed
                          ? "rgba(20,0,134,0.20)"
                          : "transparent",
                      color: active
                        ? "#fff"
                        : completed
                          ? "#a5b4fc"
                          : "rgba(255,255,255,0.35)",
                      transform: active ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {completed ? <Check size={14} /> : <Icon size={14} />}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <span
                      className="mx-1 h-0.5 w-6 transition-colors"
                      style={{
                        background: completed
                          ? "#140086"
                          : "rgba(255,255,255,0.15)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content (animated) */}
          <form onSubmit={handleRegister} className="flex flex-1 flex-col">
            <div className="relative flex-1">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-4"
                  >
                    <StepHeader
                      title="Dados Pessoais"
                      subtitle="Como podemos chamar você?"
                    />
                    <Field label="Nome Completo">
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                      />
                    </Field>
                    <Field label="E-mail Corporativo">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@empresa.com.br"
                      />
                    </Field>
                    <Field label="Celular Corporativo">
                      <div className="flex gap-1.5">
                        <DdiSelect value={phoneDdi} onChange={setPhoneDdi} />
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) =>
                            setPhone(formatCelular(e.target.value))
                          }
                          placeholder="(11) 9 9999-9999"
                          className="flex-1"
                        />
                      </div>
                    </Field>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <StepHeader
                      title="Sua Empresa"
                      subtitle="Vamos validar o CNPJ"
                    />
                    <Field label="CNPJ">
                      <div className="flex gap-1.5">
                        <Input
                          value={cnpj}
                          onChange={(e) => {
                            setCnpj(formatCNPJ(e.target.value));
                            setCnpjData(null);
                            setCnpjApproved(false);
                          }}
                          placeholder="00.000.000/0000-00"
                          className="flex-1 font-mono"
                          maxLength={18}
                        />
                        <button
                          type="button"
                          onClick={() => void lookupCnpj()}
                          disabled={
                            cnpj.replace(/\D/g, "").length !== 14 ||
                            cnpjLoading ||
                            cnpjApproved
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                          aria-label="Consultar CNPJ"
                        >
                          {cnpjLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Search size={14} />
                          )}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-zinc-500">
                        O CNPJ será usado para vincular você à sua empresa na
                        plataforma.
                      </p>
                    </Field>

                    {cnpjData !== null && !cnpjApproved && (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle2 size={14} />
                          <span className="text-xs font-medium">
                            Empresa encontrada
                          </span>
                        </div>
                        <div className="mt-3 space-y-1.5 text-xs text-zinc-300">
                          <Row
                            label="Razão Social"
                            value={cnpjData.razao_social}
                          />
                          {cnpjData.nome_fantasia !== null &&
                            cnpjData.nome_fantasia !== "" && (
                              <Row
                                label="Nome Fantasia"
                                value={cnpjData.nome_fantasia}
                              />
                            )}
                          <Row
                            label="Situação"
                            value={cnpjData.situacao}
                            valueClass={
                              cnpjData.situacao === "ATIVA"
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          />
                          <Row
                            label="Endereço"
                            value={[
                              cnpjData.logradouro,
                              cnpjData.numero,
                              cnpjData.bairro,
                              `${cnpjData.municipio}/${cnpjData.uf}`,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          />
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCnpjApproved(true)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-white transition-all"
                            style={{ background: "#140086" }}
                          >
                            <Check size={12} />
                            Confirmar Empresa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCnpjData(null);
                              setCnpj("");
                            }}
                            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
                          >
                            <X size={12} />
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    )}

                    {cnpjApproved && cnpjData !== null && (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <CheckCircle2
                            size={14}
                            className="flex-shrink-0 text-green-400"
                          />
                          <span className="truncate text-xs text-zinc-100">
                            {cnpjData.razao_social}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCnpjApproved(false);
                            setCnpjData(null);
                          }}
                          className="text-[11px] text-zinc-300 underline-offset-2 hover:underline"
                        >
                          Alterar
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-4"
                  >
                    <StepHeader
                      title="Sua Função"
                      subtitle="Conte-nos seu papel na empresa"
                    />
                    <Field label="Cargo">
                      <Select
                        value={position}
                        onChange={setPosition}
                        placeholder="Selecione um cargo"
                        options={CARGOS}
                      />
                    </Field>
                    <Field label="Área de Atuação">
                      <Select
                        value={area}
                        onChange={setArea}
                        placeholder="Selecione uma área"
                        options={AREAS}
                      />
                    </Field>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-4"
                  >
                    <StepHeader
                      title="Segurança"
                      subtitle="Crie uma senha forte para sua conta"
                    />
                    <Field label="Senha">
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                      />
                    </Field>
                    <Field label="Confirmar Senha">
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Digite a senha novamente"
                      />
                    </Field>
                    <p className="text-center text-[11px] leading-relaxed text-zinc-400">
                      Ao continuar, você concorda com nossos{" "}
                      <a
                        href="/terms"
                        className="text-zinc-200 underline-offset-2 hover:underline"
                      >
                        Termos de Serviço
                      </a>{" "}
                      e{" "}
                      <a
                        href="/privacy"
                        className="text-zinc-200 underline-offset-2 hover:underline"
                      >
                        Política de Privacidade
                      </a>
                      .
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error !== null && (
              <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            {/* Nav buttons */}
            <div className="mt-6 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={cnpjLoading || (step === 2 && !cnpjApproved)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{
                    background: "#140086",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.10) inset, 0 8px 24px rgba(20,0,134,0.45)",
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.background = "#1d00b3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#140086";
                  }}
                >
                  Continuar
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{
                    background: "#140086",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.10) inset, 0 8px 24px rgba(20,0,134,0.45)",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Criando conta…
                    </>
                  ) : (
                    "Criar Conta"
                  )}
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Já tem uma conta?{" "}
            <button
              type="button"
              onClick={() => void navigate({ to: "/login" })}
              className="text-white underline-offset-2 hover:underline"
            >
              Fazer login
            </button>
          </p>
        </section>

        {/* Hero column — ÆTHEREOS hero */}
        <section className="relative flex flex-col justify-between p-10 md:p-12">
          <div className="flex justify-end">
            <span
              style={{
                fontSize: 45,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                lineHeight: 1,
              }}
            >
              ÆTHEREOS
            </span>
          </div>
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
              Crie sua conta e tenha acesso ao OS B2B no navegador.
              Multi-tenant, AI-native, sem instalação.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

function StepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): React.ReactElement {
  return (
    <div className="mb-2 text-center">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-white/30 focus:bg-white/10";

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>,
): React.ReactElement {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={
        className !== undefined ? `${INPUT_CLS} ${className}` : INPUT_CLS
      }
    />
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: ReadonlyArray<string>;
}): React.ReactElement {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_CLS}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o} className="bg-zinc-900 text-white">
          {o}
        </option>
      ))}
    </select>
  );
}

function DdiSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  const current = DDIS.find((d) => d.code === value) ?? DDIS[0];
  if (current === undefined) throw new Error("DDIS list cannot be empty");
  return (
    <div className="relative w-[100px] flex-shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="DDI"
        className="w-full appearance-none rounded-md border border-white/10 bg-white/5 py-2.5 pl-9 pr-2 text-xs text-zinc-100 outline-none transition-colors focus:border-white/30 focus:bg-white/10"
      >
        {DDIS.map((d) => (
          <option key={d.code} value={d.code} className="bg-zinc-900">
            {d.code} {d.label}
          </option>
        ))}
      </select>
      <img
        src={`https://flagcdn.com/w40/${current.iso}.png`}
        alt=""
        width={16}
        height={11}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 rounded-[2px] object-cover"
      />
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 flex-shrink-0 text-zinc-500">{label}</span>
      <span className={`flex-1 ${valueClass ?? "text-zinc-100"}`}>{value}</span>
    </div>
  );
}
