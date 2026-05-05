// Edge Function: scp-publish
// Outbox writer atômico para emissão SCP a partir do browser.
// Recebe POST com JWT → valida → insere em kernel.scp_outbox via service_role.
//
// Ref: ADR-0020 (Driver Model bifurcação server/browser)
//      Fundamentação 8.10 [INV] — Outbox Pattern
//      CLAUDE.md seção 5 — KernelPublisher é server-only; browser usa esta função

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

// Todos os event types registrados no scp-registry.
// Mantido em sincronia com packages/scp-registry/src/schemas/*.ts.
const KNOWN_EVENT_TYPES = new Set([
  // platform.*
  "platform.tenant.created",
  "platform.company.created",
  "platform.tenant.suspended",
  "platform.user.created",
  "platform.file.uploaded",
  "platform.file.deleted",
  "platform.folder.created",
  "platform.notification.dispatched",
  "platform.person.created",
  "platform.person.updated",
  "platform.person.deactivated",
  "platform.chat.message_sent",
  "platform.chat.channel_created",
  "platform.settings.updated",
  "platform.staff.access",
  // agent.*
  "agent.registered",
  "agent.action.requested",
  "agent.action.approved",
  "agent.copilot.message_sent",
  "agent.copilot.action_proposed",
  "agent.copilot.action_approved",
  "agent.copilot.action_rejected",
  // context.*
  "context.snapshot.requested",
  "context.snapshot.ready",
  // integration.*
  "integration.connector.registered",
  "integration.sync.completed",
]);

// Event types bloqueados para actors agent (mapeiam para operações invariantes).
// Ref: Fundamentação 12.4 [INV] + packages/kernel/src/invariants/operations.ts
const AGENT_BLOCKED_EVENT_TYPES = new Set([
  "platform.person.deactivated", // employee.termination
  "platform.file.deleted", // data.deletion
  "platform.tenant.suspended", // governance.policy_change
]);

const EVENT_TYPE_REGEX = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,3}$/;

interface RequestBody {
  event_type: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  causation_id?: string;
  idempotency_key?: string;
  actor?: {
    type: "human" | "agent" | "system";
    user_id?: string;
    agent_id?: string;
    supervising_user_id?: string;
    service_name?: string;
    version?: string;
  };
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length !== 3) return {};
  try {
    const b64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req);
  if (pf !== null) return pf;

  const origin = req.headers.get("origin");

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405, origin);
  }

  // --- 1. Verificar JWT ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(
      { error: "missing or invalid authorization header" },
      401,
      origin,
    );
  }
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(jwt);

  if (authError !== null || user === null) {
    return jsonResponse({ error: "unauthorized" }, 401, origin);
  }

  // --- Rate limit (Sprint 27 MX147): 100 req/min por user ---
  const rlAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rl = await checkRateLimit(rlAdmin, user.id, "scp-publish", 100, 60);
  if (!rl.allowed) {
    return rateLimitResponse(rl, corsHeaders(origin));
  }

  // --- 2. Extrair company_id do JWT (active_company_id injetado pelo custom_access_token hook) ---
  const jwtPayload = decodeJwtPayload(jwt);
  const company_id =
    typeof jwtPayload["active_company_id"] === "string"
      ? jwtPayload["active_company_id"]
      : null;

  if (company_id === null || !isUuid(company_id)) {
    return jsonResponse(
      {
        error:
          "no active_company_id in JWT claims — selecione uma company antes de emitir eventos",
      },
      400,
      origin,
    );
  }

  // --- 3. Parse e validação do body ---
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400, origin);
  }

  const { event_type, payload, correlation_id, causation_id, idempotency_key } =
    body;

  if (typeof event_type !== "string" || !EVENT_TYPE_REGEX.test(event_type)) {
    return jsonResponse(
      {
        error:
          "event_type inválido: deve ter formato domain.entity.action (3-4 níveis, lowercase)",
      },
      400,
      origin,
    );
  }

  if (!KNOWN_EVENT_TYPES.has(event_type)) {
    return jsonResponse(
      {
        error: `event_type '${event_type}' não está registrado no scp-registry`,
      },
      400,
      origin,
    );
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return jsonResponse(
      { error: "payload deve ser um objeto JSON" },
      400,
      origin,
    );
  }

  if (!isUuid(correlation_id)) {
    return jsonResponse(
      { error: "correlation_id deve ser um UUID válido" },
      400,
      origin,
    );
  }

  if (causation_id !== undefined && !isUuid(causation_id)) {
    return jsonResponse(
      { error: "causation_id deve ser um UUID válido quando presente" },
      400,
      origin,
    );
  }

  // --- 4. Construir actor ---
  const rawActor = body.actor;
  type ActorEnvelope =
    | { type: "human"; user_id: string }
    | {
        type: "agent";
        agent_id: string;
        supervising_user_id: string;
        capability_token?: string;
      }
    | { type: "system"; service_name: string; version: string };

  let actor: ActorEnvelope;

  if (rawActor?.type === "agent") {
    if (!isUuid(rawActor.agent_id ?? "")) {
      return jsonResponse(
        { error: "actor.agent_id obrigatório para actor.type=agent" },
        400,
        origin,
      );
    }
    if (!isUuid(rawActor.supervising_user_id ?? "")) {
      return jsonResponse(
        {
          error:
            "actor.supervising_user_id obrigatório para actor.type=agent (Interpretação A+ [INV])",
        },
        400,
        origin,
      );
    }
    // 4a. Bloquear operações invariantes para agentes
    if (AGENT_BLOCKED_EVENT_TYPES.has(event_type)) {
      return jsonResponse(
        {
          error: `evento '${event_type}' corresponde a operação invariante e não pode ser emitido autonomamente por agente (Fundamentação 12.4 [INV])`,
          event_type,
          blocked_reason: "invariant_operation",
        },
        403,
        origin,
      );
    }
    actor = {
      type: "agent",
      agent_id: rawActor.agent_id as string,
      supervising_user_id: rawActor.supervising_user_id as string,
    };
  } else if (rawActor?.type === "system") {
    if (
      typeof rawActor.service_name !== "string" ||
      typeof rawActor.version !== "string"
    ) {
      return jsonResponse(
        {
          error:
            "actor.service_name e actor.version obrigatórios para actor.type=system",
        },
        400,
        origin,
      );
    }
    actor = {
      type: "system",
      service_name: rawActor.service_name,
      version: rawActor.version,
    };
  } else {
    // Default: human com user_id do JWT
    actor = { type: "human", user_id: user.id };
  }

  // --- 5. Construir envelope ---
  const event_id = crypto.randomUUID();
  const occurred_at = new Date().toISOString();

  const envelope = {
    id: event_id,
    type: event_type,
    version: "1",
    tenant_id: company_id,
    actor,
    correlation_id,
    ...(causation_id !== undefined ? { causation_id } : {}),
    payload,
    occurred_at,
    schema_version: "1",
  };

  // --- 6. Inserir no kernel.scp_outbox via service_role ---
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { error: insertError } = await adminClient
    .schema("kernel")
    .from("scp_outbox")
    .insert({
      company_id,
      event_type,
      event_id,
      payload,
      envelope,
      status: "pending",
      ...(idempotency_key !== undefined
        ? { idempotency_key } // campo existe se migration o adicionou
        : {}),
    });

  if (insertError !== null) {
    // Idempotência: conflito em event_id único = evento já registrado (ok)
    if (insertError.code === "23505") {
      return jsonResponse(
        { event_id, correlation_id, occurred_at },
        200,
        origin,
      );
    }
    console.error("[scp-publish] outbox insert error", {
      correlation_id,
      event_type,
      error: insertError.message,
    });
    return jsonResponse(
      { error: "falha ao registrar evento no outbox" },
      500,
      origin,
    );
  }

  console.log("[scp-publish] evento registrado", {
    event_id,
    event_type,
    company_id,
    correlation_id,
    actor_type: actor.type,
  });

  return jsonResponse({ event_id, correlation_id, occurred_at }, 201, origin);
});
