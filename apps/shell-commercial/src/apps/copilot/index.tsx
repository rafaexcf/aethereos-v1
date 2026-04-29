/**
 * CopilotDrawer — AI Copilot global (M45) + Shadow Mode (M46)
 *
 * P15 Budget: 2 000 tokens in / 1 000 tokens out por turno
 * P14 Modo Degenerado: withDegradedLLM() ativo; model==="degraded" → banner
 * P9 actor.type=agent em todo evento SCP emitido daqui
 * Interpretação A+: supervising_user_id obrigatório
 * Shadow Mode: Copilot propõe ações tipadas; humano aprova/rejeita (autonomia 0-1)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { instrumentedChat } from "@aethereos/kernel";
import type { LLMDriver, ObservabilityDriver } from "@aethereos/drivers";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  isDegraded: boolean;
  proposalId?: string;
  createdAt: Date;
}

type IntentType =
  | "create_person"
  | "create_file"
  | "send_notification"
  | "update_settings"
  | "create_channel";

type ProposalStatus = "pending" | "approved" | "rejected" | "executed";

interface ActionProposal {
  id: string;
  intentType: IntentType;
  payload: Record<string, unknown>;
  status: ProposalStatus;
  conversationId: string;
  createdAt: Date;
}

interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  llm: LLMDriver;
  obs: ObservabilityDriver;
  userId: string;
  companyId: string;
  correlationId?: string;
}

// ---------------------------------------------------------------------------
// Demo agent ID (substituir por kernel.agents INSERT em produção)
// ---------------------------------------------------------------------------

const DEMO_AGENT_ID = "00000000-0000-0000-0000-000000000001";

const SYSTEM_PROMPT = `Você é o Copilot do Aethereos, um assistente de OS B2B.
Ajude o usuário com tarefas dentro da plataforma: Drive, Pessoas, Chat, Configurações.
Seja conciso e direto. Responda sempre em português.
Quando o usuário pedir uma ação (criar pessoa, enviar notificação, criar canal, etc.),
diga o que você faria e que vai propor a ação para aprovação (Shadow Mode).`;

// ---------------------------------------------------------------------------
// Intent detection (keyword → ActionProposal)
// Shadow Mode: detecta intenção no texto do usuário, propõe ação tipada
// ---------------------------------------------------------------------------

const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  type: IntentType;
  buildPayload: (
    match: RegExpMatchArray,
    body: string,
  ) => Record<string, unknown>;
}> = [
  {
    pattern:
      /criar?\s+pessoa|adicionar?\s+pessoa|cadastrar?\s+pessoa|nova?\s+pessoa/i,
    type: "create_person",
    buildPayload: (_m, body) => ({
      full_name: "Nova Pessoa",
      email: "",
      source_request: body.slice(0, 120),
    }),
  },
  {
    pattern:
      /criar?\s+(pasta|arquivo|documento)|nova?\s+(pasta|arquivo)|upload/i,
    type: "create_file",
    buildPayload: (_m, body) => ({
      name: "Novo Documento",
      kind: "folder",
      source_request: body.slice(0, 120),
    }),
  },
  {
    pattern: /notifica|avisar|comunicar|alertar/i,
    type: "send_notification",
    buildPayload: (_m, body) => ({
      title: "Notificação do Copilot",
      body: body.slice(0, 200),
      type: "info",
    }),
  },
  {
    pattern: /configura|alterar?\s+config|mudar?\s+config|atualizar?\s+config/i,
    type: "update_settings",
    buildPayload: (_m, body) => ({
      scope: "company",
      key: "copilot.suggestion",
      source_request: body.slice(0, 120),
    }),
  },
  {
    pattern: /criar?\s+canal|novo\s+canal|adicionar?\s+canal/i,
    type: "create_channel",
    buildPayload: (_m, body) => ({
      name: "novo-canal",
      kind: "channel",
      source_request: body.slice(0, 120),
    }),
  },
];

const INTENT_LABELS: Record<IntentType, string> = {
  create_person: "Criar pessoa",
  create_file: "Criar arquivo/pasta",
  send_notification: "Enviar notificação",
  update_settings: "Atualizar configuração",
  create_channel: "Criar canal",
};

const INTENT_ICONS: Record<IntentType, string> = {
  create_person: "👤",
  create_file: "📁",
  send_notification: "🔔",
  update_settings: "⚙️",
  create_channel: "💬",
};

function detectIntent(body: string): ActionProposal | null {
  for (const { pattern, type, buildPayload } of INTENT_PATTERNS) {
    const match = body.match(pattern);
    if (match !== null) {
      return {
        id: crypto.randomUUID(),
        intentType: type,
        payload: buildPayload(match, body),
        status: "pending",
        conversationId: "",
        createdAt: new Date(),
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// ActionApprovalPanel — painel Shadow Mode para uma proposal pendente
// ---------------------------------------------------------------------------

interface ActionApprovalPanelProps {
  proposal: ActionProposal;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function ActionApprovalPanel({
  proposal,
  onApprove,
  onReject,
}: ActionApprovalPanelProps) {
  const statusColors: Record<ProposalStatus, string> = {
    pending: "border-violet-700/50 bg-violet-950/30",
    approved: "border-green-700/50 bg-green-950/20",
    rejected: "border-zinc-700/50 bg-zinc-900/50",
    executed: "border-green-600/50 bg-green-950/30",
  };

  return (
    <div
      className={[
        "rounded-lg border p-3 text-xs",
        statusColors[proposal.status],
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span>{INTENT_ICONS[proposal.intentType]}</span>
          <span className="font-semibold text-zinc-200">
            {INTENT_LABELS[proposal.intentType]}
          </span>
          <span className="rounded bg-violet-800/40 px-1.5 py-0.5 text-violet-300">
            Shadow Mode
          </span>
        </div>
        {proposal.status === "pending" && (
          <span className="text-zinc-500">aguarda aprovação</span>
        )}
        {proposal.status === "approved" && (
          <span className="text-green-400">✓ aprovado</span>
        )}
        {proposal.status === "executed" && (
          <span className="text-green-400">✓ executado</span>
        )}
        {proposal.status === "rejected" && (
          <span className="text-zinc-500">✗ rejeitado</span>
        )}
      </div>

      {/* Payload preview */}
      <div className="mb-2 rounded bg-zinc-900/50 p-2 font-mono text-zinc-500 leading-relaxed">
        {Object.entries(proposal.payload)
          .filter(([k]) => k !== "source_request")
          .map(([k, v]) => (
            <div key={k}>
              <span className="text-zinc-600">{k}:</span>{" "}
              <span className="text-zinc-400">{String(v)}</span>
            </div>
          ))}
      </div>

      {proposal.status === "pending" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onApprove(proposal.id)}
            className="flex-1 rounded-md bg-violet-600 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
          >
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => onReject(proposal.id)}
            className="flex-1 rounded-md border border-zinc-700 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            Rejeitar
          </button>
        </div>
      )}

      {proposal.status === "executed" && (
        <p className="text-green-500">
          Ação executada com sucesso (stub — driver não conectado).
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopilotDrawer
// ---------------------------------------------------------------------------

export function CopilotDrawer({
  open,
  onClose,
  llm,
  obs,
  userId,
  companyId,
  correlationId,
}: CopilotDrawerProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, proposals]);

  const handleApprove = useCallback((proposalId: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, status: "executed" as const } : p,
      ),
    );
    // TODO: executar ação real via driver correspondente
    // TODO: emitir agent.copilot.action_approved via KernelPublisher
    // TODO: emitir agent.copilot.action_approved com actor.type=agent
  }, []);

  const handleReject = useCallback((proposalId: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, status: "rejected" as const } : p,
      ),
    );
    // TODO: emitir agent.copilot.action_rejected via KernelPublisher
  }, []);

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (body.length === 0 || loading) return;

    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: body,
      isDegraded: false,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setLoading(true);

    llm.withTenant({
      company_id: companyId,
      actor: {
        type: "agent",
        agent_id: DEMO_AGENT_ID,
        supervising_user_id: userId,
      },
    });

    const history = [...messages, userMsg];
    const llmMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const chatOptions: Parameters<typeof instrumentedChat>[3] = {
      spanName: "copilot.chat",
      maxTokens: 1_000,
    };
    if (correlationId !== undefined) chatOptions.correlationId = correlationId;

    const result = await instrumentedChat(llm, obs, llmMessages, chatOptions);

    setLoading(false);

    // Detect intent in user message → generate Shadow Mode proposal
    const detected = detectIntent(body);

    if (result.ok) {
      const degraded = result.value.model === "degraded";
      setIsDegraded(degraded);

      let content: string;
      if (degraded) {
        if (detected !== null) {
          content = `Identifico que você quer: **${INTENT_LABELS[detected.intentType]}**. Estou propondo a ação para sua aprovação (Shadow Mode). LiteLLM em modo degenerado — configure VITE_LITELLM_KEY para respostas mais detalhadas.`;
        } else {
          content =
            "Modo Degenerado ativo — LiteLLM indisponível. Configure VITE_LITELLM_KEY para ativar o Copilot completo. Posso detectar intenções de ação do seu texto mesmo assim.";
        }
      } else {
        content = result.value.content;
      }

      let proposalId: string | undefined;
      if (detected !== null) {
        const proposal: ActionProposal = {
          ...detected,
          conversationId: conversationId.current,
        };
        proposalId = proposal.id;
        setProposals((prev) => [...prev, proposal]);
        // TODO: inserir em kernel.agent_proposals via SupabaseDatabaseDriver
        // TODO: emitir agent.copilot.action_proposed via KernelPublisher com actor.type=agent
      }

      const assistantMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        model: result.value.model,
        isDegraded: degraded,
        createdAt: new Date(),
      };
      if (proposalId !== undefined) assistantMsg.proposalId = proposalId;
      setMessages((prev) => [...prev, assistantMsg]);

      // TODO: persistir em kernel.copilot_messages via SupabaseDatabaseDriver
      // TODO: emitir agent.copilot.message_sent via KernelPublisher
    } else {
      const errMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Erro ao processar: ${result.error.message}`,
        isDegraded: true,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  }, [draft, loading, messages, llm, obs, userId, companyId, correlationId]);

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-screen w-[420px] flex-col border-l border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="text-sm font-semibold text-zinc-100">
              AI Copilot
            </span>
            {isDegraded && (
              <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-400">
                modo degenerado
              </span>
            )}
            {pendingProposals.length > 0 && (
              <span className="rounded-full bg-violet-600/40 px-2 py-0.5 text-xs text-violet-300">
                {pendingProposals.length} aguardando
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300"
            aria-label="Fechar Copilot"
          >
            ✕
          </button>
        </div>

        {/* P15 budget badge */}
        <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-950/50 px-4 py-1.5">
          <p className="text-xs text-zinc-600">
            Budget: 2 000 in / 1 000 out · actor: agent · autonomy: 0 (shadow) ·{" "}
            <span className="font-mono text-zinc-700">
              {conversationId.current.slice(0, 8)}
            </span>
          </p>
        </div>

        {/* Mensagens + proposals */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">🤖</span>
              <p className="text-sm font-medium text-zinc-300">
                Olá! Sou o Copilot do Aethereos.
              </p>
              <p className="text-xs text-zinc-500 max-w-xs">
                Posso ajudar com Drive, Pessoas, Chat e Configurações. Ações
                requerem sua aprovação via Shadow Mode.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  "Criar uma pasta no Drive",
                  "Adicionar pessoa",
                  "Criar canal de suporte",
                  "Enviar notificação para a equipe",
                ].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setDraft(hint)}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-violet-500 hover:text-violet-300"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const relatedProposal =
              msg.proposalId !== undefined
                ? proposals.find((p) => p.id === msg.proposalId)
                : undefined;

            return (
              <div
                key={msg.id}
                className={[
                  "flex flex-col gap-2",
                  msg.role === "user" ? "items-end" : "items-start",
                ].join(" ")}
              >
                <div
                  className={[
                    "max-w-[88%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-violet-600 text-white"
                      : msg.isDegraded
                        ? "border border-yellow-800/40 bg-zinc-800 text-yellow-300"
                        : "bg-zinc-800 text-zinc-100",
                  ].join(" ")}
                >
                  {msg.content}
                </div>
                {msg.model !== undefined && msg.model !== "degraded" && (
                  <span className="text-xs text-zinc-700 font-mono">
                    {msg.model}
                  </span>
                )}
                {relatedProposal !== undefined && (
                  <div className="w-full max-w-[88%]">
                    <ActionApprovalPanel
                      proposal={relatedProposal}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start">
              <div className="flex gap-1 rounded-xl bg-zinc-800 px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 focus-within:border-violet-500">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Pergunte ou peça uma ação ao Copilot…"
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={draft.trim().length === 0 || loading}
              className="shrink-0 rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-700">
            Enter para enviar · Cmd+K para fechar · ações exigem aprovação
            humana
          </p>
        </div>
      </div>
    </>
  );
}
