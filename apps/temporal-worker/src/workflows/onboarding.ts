import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "../activities/index.js";

const { sendEmail, createNotification, emitSCPEvent } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "1 minute",
  retry: { maximumAttempts: 3, initialInterval: "5s", backoffCoefficient: 2 },
});

export interface OnboardingFlowInput {
  companyId: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  companyName: string;
}

/**
 * Drip de onboarding D0 → D3 → D10. Cada passo é idempotente (Resend
 * retorna sucesso para sends idênticos; createNotification verifica
 * source_id antes de inserir).
 */
export async function onboardingFlow(
  input: OnboardingFlowInput,
): Promise<void> {
  // D0 — welcome
  await sendEmail({
    to: input.ownerEmail,
    subject: `Bem-vindo ao Aethereos, ${input.ownerName}!`,
    body: `Sua empresa ${input.companyName} foi criada. Acesse aethereos.io para começar.`,
  });
  await createNotification({
    userId: input.ownerUserId,
    companyId: input.companyId,
    title: "Bem-vindo ao Aethereos",
    body: `${input.companyName} está pronta. Comece pelo Menu Gestor.`,
    sourceApp: "onboarding-flow",
    sourceId: `welcome:${input.companyId}`,
  });
  await emitSCPEvent({
    eventType: "platform.onboarding.welcome_sent",
    payload: { company_id: input.companyId, owner_user_id: input.ownerUserId },
    companyId: input.companyId,
    actorId: input.ownerUserId,
  });

  // D3 — tips
  await sleep("3 days");
  await sendEmail({
    to: input.ownerEmail,
    subject: "Dica: Convide sua equipe para o Aethereos",
    body: "Acesse o Menu Gestor para convidar colaboradores e configurar apps.",
  });
  await createNotification({
    userId: input.ownerUserId,
    companyId: input.companyId,
    title: "Convide sua equipe",
    body: "Acesse o Gestor > Membros para convidar colaboradores.",
    sourceApp: "onboarding-flow",
    sourceId: `tips:${input.companyId}`,
  });

  // D10 — activation check
  await sleep("7 days");
  await sendEmail({
    to: input.ownerEmail,
    subject: "Como está sua experiência com o Aethereos?",
    body: "Já explorou o Copilot IA? Instale apps na Magic Store para começar.",
  });
  await emitSCPEvent({
    eventType: "platform.onboarding.completed",
    payload: { company_id: input.companyId, owner_user_id: input.ownerUserId },
    companyId: input.companyId,
    actorId: input.ownerUserId,
  });
}
