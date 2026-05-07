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
import { motion, AnimatePresence } from "framer-motion";
import { ShineBorder } from "../../components/ui/shine-border";
import { instrumentedChat } from "@aethereos/kernel";
import { isInvariantOperation } from "@aethereos/kernel";
import { COPILOT_INTENT_SCHEMAS } from "@aethereos/scp-registry";
import type { CopilotIntentPayload } from "@aethereos/scp-registry";
import type { LLMDriver, ObservabilityDriver } from "@aethereos/drivers";
import { SupabaseBrowserVectorDriver } from "@aethereos/drivers-supabase/browser";
import type { SupabaseBrowserDataDriver } from "@aethereos/drivers-supabase/browser";
import type { ScpPublisherBrowser } from "../../lib/scp-publisher-browser";
import { executeProposal } from "../../lib/proposal-executor";
import { createBrowserQuotaEnforcer } from "../../lib/quota";

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
  /** Sprint 19 MX101: numero de chunks usados como contexto RAG (0 = sem RAG) */
  ragChunkCount?: number;
  createdAt: Date;
}

type IntentType =
  | "create_person"
  | "create_file"
  | "send_notification"
  | "update_settings"
  | "create_channel";

type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "expired";

interface ActionProposal {
  id: string;
  intentType: IntentType;
  payload: CopilotIntentPayload;
  status: ProposalStatus;
  conversationId: string;
  createdAt: Date;
  executionError?: string;
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
Ajude o usuário com tarefas dentro da plataforma: Drive, Chat, Configurações.
Seja conciso e direto. Responda sempre em português.
Quando o usuário pedir uma ação (enviar notificação, criar canal, etc.),
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
  onRetry?: (id: string) => void;
}

function ActionApprovalPanel({
  proposal,
  onApprove,
  onReject,
  onRetry,
}: ActionApprovalPanelProps) {
  const hasError =
    proposal.status === "approved" && proposal.executionError !== undefined;

  // Sprint 17 MX85: status visual estendido
  const statusBorder = hasError
    ? "border-amber-700/50 bg-amber-950/20"
    : (
        {
          pending: "border-violet-700/50 bg-violet-950/30",
          approved: "border-green-700/50 bg-green-950/20",
          rejected: "border-zinc-700/50 bg-zinc-900/50",
          executed: "border-green-600/50 bg-green-950/30",
          expired: "border-zinc-700/50 bg-zinc-900/30",
        } as const
      )[proposal.status];

  return (
    <div className={["rounded-lg border p-3 text-xs", statusBorder].join(" ")}>
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
        {proposal.status === "approved" && !hasError && (
          <span className="text-green-400">✓ aprovado · executando…</span>
        )}
        {proposal.status === "approved" && hasError && (
          <span className="text-amber-400">⚠ falha na execução</span>
        )}
        {proposal.status === "executed" && (
          <span className="text-green-400">✓ executado</span>
        )}
        {proposal.status === "rejected" && (
          <span className="text-zinc-500">✗ rejeitado</span>
        )}
        {proposal.status === "expired" && (
          <span className="text-zinc-500">⌛ expirada</span>
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

      {hasError && (
        <div className="space-y-2">
          <p className="text-amber-300">
            {proposal.executionError ?? "Erro desconhecido"}
          </p>
          {onRetry !== undefined && (
            <button
              type="button"
              onClick={() => onRetry(proposal.id)}
              className="rounded-md border border-amber-700/50 bg-amber-900/30 px-3 py-1 text-xs text-amber-200 hover:bg-amber-900/50"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {proposal.status === "executed" && (
        <p className="text-green-500">Ação executada no banco com sucesso.</p>
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
        expires_at: string | null;
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

      // 4. Load proposals (Sprint 17 MX86: inclui expires_at + marca expired)
      const propsRes = await (data
        .from("agent_proposals")
        .select("id, intent_type, payload, status, created_at, expires_at")
        .eq("conversation_id", convId)
        .in("status", [
          "pending",
          "approved",
          "rejected",
          "executed",
          "expired",
        ]) as unknown as Promise<{ data: PropRow[] | null; error: unknown }>);
      if (propsRes.data !== null && propsRes.data.length > 0) {
        const nowMs = Date.now();
        const staleIds: string[] = [];
        const hydrated = propsRes.data.map((p) => {
          const expiresMs =
            p.expires_at !== null ? new Date(p.expires_at).getTime() : Infinity;
          const isStale = p.status === "pending" && expiresMs < nowMs;
          if (isStale) staleIds.push(p.id);
          return {
            id: p.id,
            intentType: p.intent_type as IntentType,
            payload: p.payload,
            status: (isStale ? "expired" : p.status) as ProposalStatus,
            conversationId: convId,
            createdAt: new Date(p.created_at),
          };
        });
        // UPDATE banco em background — sem await pra nao bloquear hydratacao
        if (staleIds.length > 0) {
          void data
            .from("agent_proposals")
            .update({ status: "expired" })
            .in("id", staleIds);
          // Sprint 17 MX87: notifica usuario que sugestao expirou (1 row por proposal)
          const expiredNotifs = staleIds.map((sid) => ({
            user_id: userId,
            company_id: companyId,
            type: "warning" as const,
            title: "Sugestão do Copilot expirou",
            body: "Uma proposta nao revisada em 1h foi descartada.",
            source_app: "copilot" as const,
            source_id: sid,
          }));
          void data.from("notifications").insert(expiredNotifs);
        }
        setProposals(hydrated as ActionProposal[]);
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

  // Sprint 17 MX85: helper interno — tenta executar uma proposal aprovada,
  // atualiza status para executed se ok ou registra executionError no UI.
  const tryExecute = useCallback(
    async (proposalId: string) => {
      const target = proposals.find((p) => p.id === proposalId);
      if (target === undefined) return;
      if (target.status === "expired") return; // R13: nunca executar expirada

      // R13 defensiva: re-checa expires_at no banco antes de executar
      const result = await executeProposal(
        { data, scp },
        {
          id: target.id,
          intentType: target.intentType,
          payload: target.payload as unknown as Record<string, unknown>,
        },
        userId,
        companyId,
      );

      if (result.ok) {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId
              ? {
                  id: p.id,
                  intentType: p.intentType,
                  payload: p.payload,
                  conversationId: p.conversationId,
                  createdAt: p.createdAt,
                  status: "executed" as const,
                }
              : p,
          ),
        );
        void data
          .from("agent_proposals")
          .update({
            status: "executed",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", proposalId);
        void scp.publishEvent(
          "agent.copilot.action_executed",
          {
            proposal_id: proposalId,
            company_id: companyId,
            executed_by: userId,
            intent_type: target.intentType,
            ...(result.resourceId !== undefined
              ? { resource_id: result.resourceId }
              : {}),
          },
          { actor: { type: "human", user_id: userId } },
        );
        // Sprint 17 MX87: notifica execucao bem-sucedida
        void data.from("notifications").insert({
          user_id: userId,
          company_id: companyId,
          type: "success",
          title: "Ação executada pelo Copilot",
          body: INTENT_LABELS[target.intentType],
          source_app: "copilot",
          source_id: proposalId,
        });
      } else {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  status: "approved" as const,
                  executionError: result.error ?? "Falha desconhecida",
                }
              : p,
          ),
        );
      }
    },
    [data, scp, userId, companyId, proposals],
  );

  const handleApprove = useCallback(
    async (proposalId: string) => {
      // 1. Marca approved localmente + UPDATE no banco + SCP approved
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? {
                id: p.id,
                intentType: p.intentType,
                payload: p.payload,
                conversationId: p.conversationId,
                createdAt: p.createdAt,
                status: "approved" as const,
              }
            : p,
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

      // 2. Sprint 17 MX85: dispara execucao real
      await tryExecute(proposalId);
    },
    [data, scp, userId, companyId, tryExecute],
  );

  // Botao Tentar novamente quando approved + executionError
  const handleRetryExecute = useCallback(
    async (proposalId: string) => {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? {
                id: p.id,
                intentType: p.intentType,
                payload: p.payload,
                conversationId: p.conversationId,
                createdAt: p.createdAt,
                status: p.status,
              }
            : p,
        ),
      );
      await tryExecute(proposalId);
    },
    [tryExecute],
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

    // HOTFIX — Quota check antes de chamar LLM. Free: 100 queries/mês.
    const quotaEnforcer = createBrowserQuotaEnforcer(data, companyId);
    const quotaCheck = await quotaEnforcer.checkAIQuery(companyId);
    if (!quotaCheck.allowed) {
      setLoading(false);
      const blockedMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          quotaCheck.reason ??
          "Limite de consultas IA atingido este mês. Faça upgrade do plano em Gestor > Plano & Assinatura.",
        isDegraded: false,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, blockedMsg]);
      return;
    }

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

        // Super Sprint A / MX200 — avalia policy ANTES de inserir.
        // Resultado: allow → status=approved + auto_resolved; deny → rejected;
        // require_approval → pending (fluxo manual antigo).
        const policyMod = await import("../../lib/policy/browser-evaluator");
        let evalResult: Awaited<
          ReturnType<typeof policyMod.evaluateProposal>
        > | null = null;
        try {
          evalResult = await policyMod.evaluateProposal(data, {
            companyId,
            intentType: proposal.intentType,
            actorId: userId,
            payload: proposal.payload as Record<string, unknown>,
            proposalId: proposal.id,
          });
        } catch {
          // Falha na avaliação: cai pro fluxo legado (status=pending).
        }

        const proposalStatus =
          evalResult === null
            ? "pending"
            : evalResult.result === "allow"
              ? "approved"
              : evalResult.result === "deny"
                ? "rejected"
                : "pending";

        const proposalRow: Record<string, unknown> = {
          id: proposal.id,
          company_id: companyId,
          agent_id: agentId.current ?? DEMO_AGENT_ID,
          conversation_id: convId,
          supervising_user_id: userId,
          intent_type: proposal.intentType,
          payload: proposal.payload,
          status: proposalStatus,
        };
        if (correlationId !== undefined)
          proposalRow["correlation_id"] = correlationId;
        if (evalResult !== null) {
          proposalRow["policy_evaluation_id"] = evalResult.evaluationId;
          if (evalResult.result === "allow" || evalResult.result === "deny") {
            proposalRow["auto_resolved"] = true;
            proposalRow["auto_resolved_reason"] = evalResult.reason;
            if (evalResult.result === "deny") {
              proposalRow["rejection_reason"] = evalResult.reason;
            }
          }
        }
        void data.from("agent_proposals").insert(proposalRow);
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
        // Sprint 17 MX87: notifica usuario sobre nova sugestao do Copilot
        void data.from("notifications").insert({
          user_id: userId,
          company_id: companyId,
          type: "info",
          title: "Copilot sugeriu uma ação",
          body: INTENT_LABELS[proposal.intentType],
          source_app: "copilot",
          source_id: proposal.id,
        });
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
      if (ragChunkCount > 0) assistantMsg.ragChunkCount = ragChunkCount;
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60]"
            style={{
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
            onClick={onClose}
            aria-hidden
          />

          {/* Gaveta — abre acima da Dock */}
          <motion.div
            key="ai-modal"
            initial={{ opacity: 0, x: "-50%", y: 24 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[61] flex flex-col"
            style={{
              bottom: 100,
              left: "50%",
              width: "min(680px, 88vw)",
              height: "min(520px, 72vh)",
              borderRadius: 16,
              background: "rgba(8,10,18,0.97)",
              boxShadow:
                "0 -4px 40px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            {/* ShineBorder — efeito de borda animado */}
            <ShineBorder
              borderWidth={1.5}
              duration={10}
              shineColor={["#8b5cf6", "#a78bfa", "#c4b5fd", "#7c3aed"]}
            />

            {/* Header */}
            <div
              className="flex shrink-0 items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "rgba(139,92,246,0.20)",
                    border: "1px solid rgba(139,92,246,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                  }}
                >
                  ✦
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.95)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Aether AI
                  </span>
                  {isDegraded && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: "rgba(234,179,8,0.15)",
                        border: "1px solid rgba(234,179,8,0.3)",
                        fontSize: 10,
                        color: "#fbbf24",
                        fontWeight: 600,
                      }}
                    >
                      modo degenerado
                    </span>
                  )}
                  {pendingProposals.length > 0 && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: "rgba(139,92,246,0.18)",
                        border: "1px solid rgba(139,92,246,0.35)",
                        fontSize: 10,
                        color: "#c4b5fd",
                        fontWeight: 600,
                      }}
                    >
                      {pendingProposals.length} aguardando
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  transition: "background 120ms, color 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                }}
                aria-label="Fechar Aether AI"
              >
                ✕
              </button>
            </div>

            {/* Mensagens */}
            <div
              className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
              style={{ minHeight: 0 }}
            >
              {messages.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: "rgba(139,92,246,0.15)",
                      border: "1px solid rgba(139,92,246,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    ✦
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.9)",
                        marginBottom: 6,
                      }}
                    >
                      Olá! Sou o Aether AI.
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.4)",
                        maxWidth: 340,
                        lineHeight: 1.5,
                      }}
                    >
                      Posso ajudar com Drive, Chat e Configurações. Ações
                      requerem sua aprovação.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {[
                      "Criar uma pasta no Drive",
                      "Criar canal de suporte",
                      "Enviar notificação para a equipe",
                    ].map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => setDraft(hint)}
                        style={{
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.10)",
                          padding: "5px 12px",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.45)",
                          cursor: "pointer",
                          background: "transparent",
                          transition: "border-color 120ms, color 120ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(139,92,246,0.6)";
                          e.currentTarget.style.color = "#c4b5fd";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(255,255,255,0.10)";
                          e.currentTarget.style.color =
                            "rgba(255,255,255,0.45)";
                        }}
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
                      style={{
                        maxWidth: "88%",
                        borderRadius: 14,
                        padding: "10px 14px",
                        fontSize: 13,
                        lineHeight: 1.55,
                        ...(msg.role === "user"
                          ? {
                              background: "rgba(139,92,246,0.85)",
                              color: "#fff",
                            }
                          : msg.isDegraded
                            ? {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(234,179,8,0.25)",
                                color: "#fde68a",
                              }
                            : {
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                color: "rgba(255,255,255,0.88)",
                              }),
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.model !== undefined && msg.model !== "degraded" && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.2)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {msg.model}
                      </span>
                    )}
                    {msg.ragChunkCount !== undefined &&
                      msg.ragChunkCount > 0 && (
                        <span
                          title={`Resposta baseada em ${msg.ragChunkCount} trecho(s) dos dados da empresa (RAG via pgvector)`}
                          style={{
                            fontSize: 10,
                            color: "rgba(139,92,246,0.85)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          ◆ {msg.ragChunkCount} contexto
                          {msg.ragChunkCount !== 1 ? "s" : ""} da empresa
                        </span>
                      )}
                    {relatedProposal !== undefined && (
                      <div style={{ width: "100%", maxWidth: "88%" }}>
                        <ActionApprovalPanel
                          proposal={relatedProposal}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onRetry={handleRetryExecute}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start">
                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      borderRadius: 14,
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="animate-bounce rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: "rgba(139,92,246,0.7)",
                          animationDelay: `${delay}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input — ChatGPT style */}
            <div
              className="shrink-0 px-4 pb-4 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  transition: "border-color 150ms",
                }}
                onFocusCapture={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(139,92,246,0.5)";
                }}
                onBlurCapture={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(255,255,255,0.09)";
                }}
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={
                    historyLoaded
                      ? "Pergunte ou peça uma ação ao Aether AI…"
                      : "Carregando histórico…"
                  }
                  disabled={loading || !historyLoaded}
                  style={{
                    display: "block",
                    width: "100%",
                    resize: "none",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "13px 52px 13px 16px",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: 1.5,
                    maxHeight: 120,
                    overflowY: "auto",
                    fontFamily: "inherit",
                  }}
                  className="placeholder-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={
                    draft.trim().length === 0 || loading || !historyLoaded
                  }
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background:
                      draft.trim().length > 0
                        ? "rgba(139,92,246,0.9)"
                        : "rgba(255,255,255,0.07)",
                    border: "none",
                    cursor: draft.trim().length > 0 ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 150ms",
                    opacity: loading || !historyLoaded ? 0.4 : 1,
                  }}
                  aria-label="Enviar"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.18)",
                  textAlign: "center",
                }}
              >
                Enter para enviar · Shift+Enter nova linha · ações exigem
                aprovação humana
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
