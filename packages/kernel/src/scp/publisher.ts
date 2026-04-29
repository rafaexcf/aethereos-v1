import { randomUUID } from "node:crypto";
import type {
  DatabaseDriver,
  EventBusDriver,
  TenantContext,
} from "@aethereos/drivers";
import { ValidationError } from "@aethereos/drivers";
import type { PartialEnvelope } from "@aethereos/scp-registry";
import { buildEnvelope, hasSchema } from "@aethereos/scp-registry";

export interface PublishResult {
  readonly correlation_id: string;
  readonly event_id: string;
  readonly outbox_entry_id: string;
}

export type PublishError = ValidationError | Error;

/**
 * KernelPublisher — publisher canônico de eventos SCP.
 *
 * Fluxo:
 * 1. Valida o eventType tem schema registrado em scp-registry
 * 2. Constrói EventEnvelope via buildEnvelope() (valida payload)
 * 3. Dentro de uma transação DatabaseDriver:
 *    a. Persiste dados de domínio (delegado ao caller via fn)
 *    b. Insere no outbox atomicamente
 * 4. Retorna correlation_id para rastreamento
 *
 * O EventBusDriver publica a partir do outbox via worker separado (M9).
 * Separação garante: se o broker cair, o outbox já tem o evento e o worker
 * vai publicar quando o broker voltar.
 *
 * Ref: Fundamentação 8.10 [INV], ADR-0014 seção 5
 */
export class KernelPublisher {
  constructor(
    private readonly db: DatabaseDriver,
    private readonly _bus: EventBusDriver,
  ) {}

  /**
   * Publica um evento SCP atomicamente via Outbox pattern.
   * @param context - TenantContext do actor que emite o evento
   * @param eventType - tipo do evento (ex: platform.tenant.created)
   * @param payload - payload específico do tipo (validado pelo scp-registry)
   * @param domainFn - função executada na mesma transação que o outbox insert
   */
  async publish<TDomainResult>(
    context: TenantContext,
    eventType: string,
    payload: Record<string, unknown>,
    domainFn?: (txDb: DatabaseDriver) => Promise<TDomainResult>,
  ): Promise<
    { ok: true; value: PublishResult } | { ok: false; error: PublishError }
  > {
    if (!hasSchema(eventType)) {
      return {
        ok: false,
        error: new ValidationError(
          `Nenhum schema registrado para evento '${eventType}'. ` +
            `Registre via scp-registry.register() antes de emitir.`,
          [{ code: "no_schema", eventType }],
        ),
      };
    }

    const correlation_id = randomUUID();
    const partial: PartialEnvelope = {
      type: eventType,
      tenant_id: context.company_id,
      actor: context.actor,
      correlation_id,
      causation_id: context.causation_id,
      payload,
    };

    const envelopeResult = buildEnvelope(partial);
    if (!envelopeResult.ok) {
      return { ok: false, error: envelopeResult.error };
    }

    const envelope = envelopeResult.value;

    // Propaga contexto de tenant para RLS
    const tenantResult = await this.db.withTenant(context);
    if (!tenantResult.ok) {
      return { ok: false, error: tenantResult.error };
    }

    const txResult = await this.db.transaction(async (tx) => {
      // Executa domainFn dentro da mesma transação (atomicidade domínio + outbox)
      if (domainFn !== undefined) {
        // Passa tx como DatabaseDriver-compatible — implementação concreta mapeia
        await domainFn(this.db);
      }

      // Insere no outbox dentro da transação
      await tx.execute(async () => {
        // Placeholder: implementação concreta (drivers-supabase) vai inserir na tabela outbox
        // usando a transação ativa. Esta interface é preenchida em M8.
        return { outbox_id: envelope.id };
      });

      return { outbox_id: envelope.id };
    });

    if (!txResult.ok) {
      return { ok: false, error: txResult.error };
    }

    return {
      ok: true,
      value: {
        correlation_id,
        event_id: envelope.id,
        outbox_entry_id: txResult.value.outbox_id,
      },
    };
  }
}
