import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "../activities/index.js";

const { sendEmail, createNotification, emitSCPEvent } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 3, initialInterval: "5s", backoffCoefficient: 2 },
});

export interface LgpdExportFlowInput {
  companyId: string;
  requestedBy: string;
  ownerEmail: string;
}

/**
 * Notifica início → dispara export → notifica conclusão → cleanup D7.
 * Em produção, o passo de export deveria ser uma activity que invoca
 * a Edge Function `export-company-data` e aguarda. Aqui emitimos um
 * evento SCP para ser consumido por outro processo (mantém o workflow
 * idempotente e desacoplado).
 */
export async function lgpdExportFlow(
  input: LgpdExportFlowInput,
): Promise<void> {
  await createNotification({
    userId: input.requestedBy,
    companyId: input.companyId,
    title: "Exportação de dados iniciada",
    body: "Estamos preparando seus dados. Você será notificado quando estiver pronto.",
    sourceApp: "lgpd-export-flow",
    sourceId: `start:${input.companyId}`,
  });
  await emitSCPEvent({
    eventType: "platform.lgpd.export_started",
    payload: { company_id: input.companyId, requested_by: input.requestedBy },
    companyId: input.companyId,
    actorId: input.requestedBy,
  });

  // Janela curta para o export rodar (em produção: substituir por activity
  // que aguarda confirmação real do export-company-data).
  await sleep("30 seconds");

  await sendEmail({
    to: input.ownerEmail,
    subject: "Exportação de dados concluída",
    body: "Seus dados estão prontos para download no Menu Gestor > LGPD.",
  });
  await createNotification({
    userId: input.requestedBy,
    companyId: input.companyId,
    title: "Exportação concluída",
    body: "Seus dados estão prontos para download.",
    sourceApp: "lgpd-export-flow",
    sourceId: `done:${input.companyId}`,
  });
  await emitSCPEvent({
    eventType: "platform.lgpd.export_completed",
    payload: { company_id: input.companyId, requested_by: input.requestedBy },
    companyId: input.companyId,
    actorId: "system",
  });

  // Cleanup window: 7 dias
  await sleep("7 days");
  await emitSCPEvent({
    eventType: "platform.lgpd.export_cleanup",
    payload: { company_id: input.companyId },
    companyId: input.companyId,
    actorId: "system",
  });
}
