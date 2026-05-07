import { randomUUID } from "node:crypto";
import { insertSupabase } from "./supabase.js";

export interface EmitSCPEventParams {
  eventType: string;
  payload: Record<string, unknown>;
  companyId: string;
  actorId: string;
  actorType?: "user" | "agent" | "system";
  correlationId?: string;
  causationId?: string;
}

export async function emitSCPEvent(
  params: EmitSCPEventParams,
): Promise<{ eventId: string }> {
  const eventId = randomUUID();
  const actorType = params.actorType ?? "system";

  const envelope = {
    event_id: eventId,
    event_type: params.eventType,
    occurred_at: new Date().toISOString(),
    company_id: params.companyId,
    actor: { id: params.actorId, type: actorType },
    payload: params.payload,
    correlation_id: params.correlationId ?? eventId,
    causation_id: params.causationId ?? null,
    schema_version: 1,
  };

  await insertSupabase({
    table: "kernel.scp_outbox",
    data: {
      event_id: eventId,
      event_type: params.eventType,
      company_id: params.companyId,
      payload: params.payload,
      envelope,
      attempts: 0,
    },
  });

  return { eventId };
}
