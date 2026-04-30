/**
 * CopilotDrawer — AI Copilot global (M45) + Shadow Mode (M46)
 *
 * P15 Budget: 2 000 tokens in / 1 000 tokens out por turno
 * P14 Modo Degenerado: withDegradedLLM() ativo; model==="degraded" → banner
 * P9 actor.type=agent em todo evento SCP emitido daqui
 * Interpretação A+: supervising_user_id obrigatório
 * Shadow Mode: Copilot propõe ações tipadas; humano aprova/rejeita (autonomia 0-1)
 * MX5: intents validados via Zod (COPILOT_INTENT_SCHEMAS); operações invariantes
 *       (Fundamentação 12.4) bloqueadas por canPropose() antes de criar proposta.
 * MX16: RAG retrieval (cego — roda mesmo em degradado; NÃO VALIDADO E2E com LLM real)
 * MX19: persistência real em kernel.copilot_messages, kernel.agent_proposals,
 *        kernel.copilot_conversations + emissão SCP (agent.copilot.*)
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { instrumentedChat } from "@aethereos/kernel";
import { isInvariantOperation } from "@aethereos/kernel";
import { COPILOT_INTENT_SCHEMAS } from "@aethereos/scp-registry";
import type { CopilotIntentPayload } from "@aethereos/scp-registry";
import type { LLMDriver, ObservabilityDriver } from "@aethereos/drivers";
import { SupabaseBrowserVectorDriver } from "@aethereos/drivers-supabase/browser";
import type { SupabaseBrowserDataDriver } from "@aethereos/drivers-supabase/browser";
import type { ScpPublisherBrowser } from "../../lib/scp-publisher-browser";

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
  payload: CopilotIntentPayload;
  status: ProposalStatus;
  conversationId: string;
  createdAt: Date;
}

interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  llm: LLMDriver;
  obs: ObservabilityDriver;
  data: SupabaseBrowserDataDriver;
  scp: ScpPublisherBrowser;
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
// RAG helpers (MX16)
// ---------------------------------------------------------------------------

async function fetchQueryEmbedding(
  supabaseUrl: string,
  anonKey: string,
  text: string,
): Promise<number[] | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/embed-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { embedding?: number[] };
    return body.embedding ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Operações bloqueadas (Fundamentação 12.4 [INV])
// Detectadas por regex ANTES de tentar gerar proposta.
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS: Array<{
  pattern: RegExp;
  operationId: string;
}> = [
  {
    pattern: /demitir|dispensar|rescis[aã]o|terminar\s+contrato/i,
    operationId: "employee.termination",
  },
  {
    pattern: /bloquear\s+(fornecedor|cliente)|remover\s+(fornecedor|cliente)/i,
    operationId: "entity.structural_change",
  },
  {
    pattern: /plano\s+de\s+contas|conta\s+cont[aá]bil/i,
    operationId: "accounting.chart_of_accounts_change",
  },
  {
    pattern: /transfer[eê]ncia|transferir\s+valor|pagar\s+fatura\s+acima/i,
    operationId: "financial.transfer_above_limit",
  },
  {
    pattern: /pol[ií]tica\s+de\s+governan[cç]a|alterar\s+pol[ií]tica/i,
    operationId: "governance.policy_change",
  },
  {
    pattern:
      /acesso\s+(admin|privilegiado)|revogar\s+acesso|conceder\s+acesso/i,
    operationId: "access.privileged_change",
  },
  {
    pattern: /excluir\s+(todos|dados|registros)|deletar\s+(todos|dados)/i,
    operationId: "data.deletion",
  },
  {
    pattern: /regime\s+tribut[aá]rio|sefaz|cadastro\s+fiscal|cnpj\s+fiscal/i,
    operationId: "fiscal.tax_config_change",
  },
];

interface CanProposeResult {
  allowed: boolean;
  reason?: string;
}

function canPropose(body: string): CanProposeResult {
  for (const { pattern, operationId } of BLOCKED_PATTERNS) {
    if (pattern.test(body) && isInvariantOperation(operationId)) {
      return {
        allowed: false,
        reason: `Operação '${operationId}' é invariante (Fundamentação 12.4). Não posso propor esta ação automaticamente — requer aprovação humana explícita fora do Shadow Mode.`,
      };
    }
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Intent detection (keyword → ActionProposal com payload tipado via Zod)
// ---------------------------------------------------------------------------

const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  type: IntentType;
  buildRaw: (body: string) => Record<string, unknown>;
}> = [
  {
    pattern:
      /criar?\s+pessoa|adicionar?\s+pessoa|cadastrar?\s+pessoa|nova?\s+pessoa/i,
    type: "create_person",
    buildRaw: (body) => ({
      full_name: "Nova Pessoa",
      email: "",
      source_request: body.slice(0, 120),
    }),
  },
  {
    pattern:
      /criar?\s+(pasta|arquivo|documento)|nova?\s+(pasta|arquivo)|upload/i,
    type: "create_file",
    buildRaw: (body) => ({
      name: "Novo Documento",
      kind: "folder",
      source_request: body.slice(0, 120),
    }),
  },
  {
    pattern: /notifica|avisar|comunicar|alertar/i,
    type: "send_notification",
    buildRaw: (body) => ({
      title: "Notificação do Copilot",
      body: body.slice(0, 200),
      type: "info",
    }),
  },
  {
    pattern: /configura|alterar?\s+config|mudar?\s+config|atualizar?\s+config/i,
    type: "update_settings",
    buildRaw: (body) => ({
      scope: "company",
      key: "copilot.suggestion",
      source_request: body.slice(0, 120),
    }),
  },
  {
    pattern: /criar?\s+canal|novo\s+canal|adicionar?\s+canal/i,
    type: "create_channel",
    buildRaw: (body) => ({
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
  for (const { pattern, type, buildRaw } of INTENT_PATTERNS) {
    if (!pattern.test(body)) continue;

    const schema = COPILOT_INTENT_SCHEMAS[type];
    const parsed = schema.safeParse(buildRaw(body));
    if (!parsed.success) continue;

    const payload = {
      intent_type: type,
      ...parsed.data,
    } as CopilotIntentPayload;

    return {
      id: crypto.randomUUID(),
      intentType: type,
      payload,
      status: "pending",
      conversationId: "",
      createdAt: new Date(),
    };
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

      {/* Payload preview — exclui campos internos */}
      <div className="mb-2 rounded bg-zinc-900/50 p-2 font-mono text-zinc-500 leading-relaxed">
        {Object.entries(proposal.payload)
          .filter(([k]) => k !== "source_request" && k !== "intent_type")
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
  data,
  scp,
  userId,
  companyId,
  correlationId,
}: CopilotDrawerProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationId = useRef<string | null>(null);
  const agentId = useRef<string | null>(null);

  const initConversation = useCallback(async () => {
    if (conversationId.current !== null) return;
    try {
      type AgentRow = { id: string };
      type ConvRow = { id: string };
      type MsgRow = {
        id: string;
        role: string;
        content: string;
        model: string | null;
        created_at: string;
      };
      type PropRow = {
        id: string;
        intent_type: string;
        payload: CopilotIntentPayload;
        status: string;
        created_at: string;
      };

      // 1. Find or create copilot agent for this company
      const agentRes = await (data
        .from("agents")
        .select("id")
        .eq("company_id", companyId)
        .eq("name", "Copilot")
        .limit(1)
        .maybeSingle() as unknown as Promise<{
        data: AgentRow | null;
        error: unknown;
      }>);
      let agtId: string;
      if (agentRes.data !== null) {
        agtId = agentRes.data.id;
      } else {
        const insertRes = await (data
          .from("agents")
          .insert({
            company_id: companyId,
            supervising_user_id: userId,
            name: "Copilot",
            description: "AI Copilot assistivo (Shadow Mode, autonomia 0-1)",
            capabilities: ["read", "propose"],
            kind: "copilot",
            autonomy_level: 0,
          })
          .select("id")
          .single() as unknown as Promise<{
          data: AgentRow | null;
          error: unknown;
        }>);
        if (insertRes.data === null) {
          conversationId.current = crypto.randomUUID();
          agentId.current = DEMO_AGENT_ID;
          setHistoryLoaded(true);
          return;
        }
        agtId = insertRes.data.id;
      }
      agentId.current = agtId;

      // 2. Find most recent conversation for this user+agent or create new
      const convRes = await (data
        .from("copilot_conversations")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .eq("agent_id", agtId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as Promise<{
        data: ConvRow | null;
        error: unknown;
      }>);
      let convId: string;
      if (convRes.data !== null) {
        convId = convRes.data.id;
      } else {
        convId = crypto.randomUUID();
        await data.from("copilot_conversations").insert({
          id: convId,
          company_id: companyId,
          agent_id: agtId,
          user_id: userId,
          title: "Conversa com Copilot",
        });
      }
      conversationId.current = convId;

      // 3. Load message history
      const msgsRes = await (data
        .from("copilot_messages")
        .select("id, role, content, model, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(50) as unknown as Promise<{
        data: MsgRow[] | null;
        error: unknown;
      }>);
      if (msgsRes.data !== null && msgsRes.data.length > 0) {
        setMessages(
          msgsRes.data.map((m) => {
            const msg: CopilotMessage = {
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              isDegraded: m.model === "degraded",
              createdAt: new Date(m.created_at),
            };
            if (m.model !== null) msg.model = m.model;
            return msg;
          }),
        );
      }

      // 4. Load pending proposals
      const propsRes = await (data
        .from("agent_proposals")
        .select("id, intent_type, payload, status, created_at")
        .eq("conversation_id", convId)
        .in("status", [
          "pending",
          "approved",
          "rejected",
        ]) as unknown as Promise<{ data: PropRow[] | null; error: unknown }>);
      if (propsRes.data !== null && propsRes.data.length > 0) {
        setProposals(
          propsRes.data.map((p) => ({
            id: p.id,
            intentType: p.intent_type as IntentType,
            payload: p.payload,
            status: p.status as ProposalStatus,
            conversationId: convId,
            createdAt: new Date(p.created_at),
          })),
        );
      }
    } catch {
      conversationId.current = crypto.randomUUID();
      agentId.current = DEMO_AGENT_ID;
    } finally {
      setHistoryLoaded(true);
    }
  }, [data, companyId, userId]);

  const vectorDriver = useMemo(() => {
    const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] ?? "";
    const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] ?? "";
    if (!supabaseUrl || !anonKey) return null;
    return new SupabaseBrowserVectorDriver({
      supabaseUrl,
      supabaseAnonKey: anonKey,
    });
  }, []);

  useEffect(() => {
    if (open) {
      void initConversation();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, proposals]);

  const handleApprove = useCallback(
    (proposalId: string) => {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, status: "approved" as const } : p,
        ),
      );
      void data
        .from("agent_proposals")
        .update({
          status: "approved",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);
      void scp.publishEvent(
        "agent.copilot.action_approved",
        {
          proposal_id: proposalId,
          company_id: companyId,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        },
        {
          actor: {
            type: "agent",
            agent_id: agentId.current ?? DEMO_AGENT_ID,
            supervising_user_id: userId,
          },
        },
      );
    },
    [data, scp, userId, companyId],
  );

  const handleReject = useCallback(
    (proposalId: string) => {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, status: "rejected" as const } : p,
        ),
      );
      void data
        .from("agent_proposals")
        .update({
          status: "rejected",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);
      void scp.publishEvent(
        "agent.copilot.action_rejected",
        {
          proposal_id: proposalId,
          company_id: companyId,
          rejected_by: userId,
        },
        {
          actor: {
            type: "agent",
            agent_id: agentId.current ?? DEMO_AGENT_ID,
            supervising_user_id: userId,
          },
        },
      );
    },
    [data, scp, userId, companyId],
  );

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

    // Persist user message fire-and-forget
    if (conversationId.current !== null) {
      void data.from("copilot_messages").insert({
        id: userMsg.id,
        conversation_id: conversationId.current,
        role: "user",
        content: body,
        ...(correlationId !== undefined
          ? { correlation_id: correlationId }
          : {}),
      });
    }

    // Verifica operações invariantes ANTES de chamar LLM (Fundamentação 12.4)
    const permission = canPropose(body);
    if (!permission.allowed) {
      setLoading(false);
      const blockedMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Não posso propor esta ação. ${permission.reason ?? "Operação bloqueada por guardrail de agente (Fundamentação 12.4 [INV])."}`,
        isDegraded: false,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, blockedMsg]);
      return;
    }

    // RAG retrieval — runs even in degraded mode (MX16, P14)
    let ragChunkCount = 0;
    let ragContextText = "";
    if (vectorDriver !== null) {
      const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] ?? "";
      const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] ?? "";
      const embedding = await fetchQueryEmbedding(supabaseUrl, anonKey, body);
      if (embedding !== null) {
        vectorDriver.withTenant({
          company_id: companyId,
          actor: {
            type: "agent",
            agent_id: DEMO_AGENT_ID,
            supervising_user_id: userId,
          },
        });
        const searchResult = await vectorDriver.search(
          "embeddings",
          embedding,
          {
            topK: 5,
            includeContent: true,
          },
        );
        if (searchResult.ok && searchResult.value.length > 0) {
          ragChunkCount = searchResult.value.length;
          ragContextText = searchResult.value
            .filter((r) => typeof r.content === "string")
            .map((r) => r.content as string)
            .join("\n---\n");
        }
      }
    }

    llm.withTenant({
      company_id: companyId,
      actor: {
        type: "agent",
        agent_id: DEMO_AGENT_ID,
        supervising_user_id: userId,
      },
    });

    const history = [...messages, userMsg];
    const systemContent =
      ragContextText.length > 0
        ? `${SYSTEM_PROMPT}\n\nContexto relevante dos documentos da empresa (use para embasar sua resposta):\n---\n${ragContextText}\n---`
        : SYSTEM_PROMPT;
    const llmMessages = [
      { role: "system" as const, content: systemContent },
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

    // Detect intent em userMsg → gera proposta Shadow Mode (payload tipado via Zod)
    const detected = detectIntent(body);

    if (result.ok) {
      const degraded = result.value.model === "degraded";
      setIsDegraded(degraded);

      let content: string;
      if (degraded) {
        if (ragChunkCount > 0) {
          const plural = ragChunkCount !== 1 ? "s" : "";
          content = `📚 Encontrei ${ragChunkCount} trecho${plural} relevante${plural} em seus documentos. Copilot offline — habilite chave LLM para receber resposta sintetizada.`;
        } else if (detected !== null) {
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
        const convId = conversationId.current ?? crypto.randomUUID();
        const proposal: ActionProposal = {
          ...detected,
          conversationId: convId,
        };
        proposalId = proposal.id;
        setProposals((prev) => [...prev, proposal]);
        // Persist proposal to DB
        void data.from("agent_proposals").insert({
          id: proposal.id,
          company_id: companyId,
          agent_id: agentId.current ?? DEMO_AGENT_ID,
          conversation_id: convId,
          supervising_user_id: userId,
          intent_type: proposal.intentType,
          payload: proposal.payload,
          ...(correlationId !== undefined
            ? { correlation_id: correlationId }
            : {}),
        });
        // Emit SCP event
        void scp.publishEvent(
          "agent.copilot.action_proposed",
          {
            proposal_id: proposal.id,
            conversation_id: convId,
            company_id: companyId,
            agent_id: agentId.current ?? DEMO_AGENT_ID,
            supervising_user_id: userId,
            intent_type: proposal.intentType,
            payload_preview: proposal.payload,
          },
          {
            actor: {
              type: "agent",
              agent_id: agentId.current ?? DEMO_AGENT_ID,
              supervising_user_id: userId,
            },
          },
        );
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

      // Persist assistant message + emit SCP event
      if (conversationId.current !== null) {
        void data.from("copilot_messages").insert({
          id: assistantMsg.id,
          conversation_id: conversationId.current,
          role: "assistant",
          content: content,
          model: result.value.model,
          ...(correlationId !== undefined
            ? { correlation_id: correlationId }
            : {}),
        });
        void scp.publishEvent(
          "agent.copilot.message_sent",
          {
            message_id: assistantMsg.id,
            conversation_id: conversationId.current,
            company_id: companyId,
            agent_id: agentId.current ?? DEMO_AGENT_ID,
            supervising_user_id: userId,
            role: "assistant",
            model: result.value.model,
          },
          {
            actor: {
              type: "agent",
              agent_id: agentId.current ?? DEMO_AGENT_ID,
              supervising_user_id: userId,
            },
          },
        );
      }
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
  }, [
    draft,
    loading,
    messages,
    llm,
    obs,
    data,
    scp,
    userId,
    companyId,
    correlationId,
    vectorDriver,
  ]);

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
              {(conversationId.current ?? "carregando").slice(0, 8)}
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
              placeholder={
                historyLoaded
                  ? "Pergunte ou peça uma ação ao Copilot…"
                  : "Carregando histórico…"
              }
              disabled={loading || !historyLoaded}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={draft.trim().length === 0 || loading || !historyLoaded}
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
