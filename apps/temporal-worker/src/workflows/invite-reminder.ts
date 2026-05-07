import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "../activities/index.js";

const { sendEmail, querySupabase, updateSupabase, emitSCPEvent } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "1 minute",
    retry: { maximumAttempts: 3, initialInterval: "5s", backoffCoefficient: 2 },
  });

export interface InviteReminderFlowInput {
  inviteId: string;
  email: string;
  companyId: string;
  companyName: string;
  invitedBy: string;
}

interface MembershipRow {
  status?: string;
}

async function isAccepted(inviteId: string): Promise<boolean> {
  const rows = await querySupabase({
    table: "kernel.tenant_memberships",
    filter: { id: inviteId },
    limit: 1,
  });
  if (rows.length === 0) return false;
  const row = rows[0] as MembershipRow;
  return row.status === "active";
}

/**
 * D3: reminder se ainda pendente. D7: expira convite.
 * Se o convite for aceito a qualquer momento, encerra silenciosamente.
 */
export async function inviteReminderFlow(
  input: InviteReminderFlowInput,
): Promise<void> {
  await sleep("3 days");
  if (await isAccepted(input.inviteId)) return;

  await sendEmail({
    to: input.email,
    subject: `Lembrete: você foi convidado para ${input.companyName}`,
    body: `${input.invitedBy} convidou você para ${input.companyName} no Aethereos. Acesse o link no e-mail anterior para aceitar.`,
  });

  await sleep("4 days");
  if (await isAccepted(input.inviteId)) return;

  await updateSupabase({
    table: "kernel.tenant_memberships",
    id: input.inviteId,
    data: { status: "expired" },
  });

  await emitSCPEvent({
    eventType: "platform.invite.expired",
    payload: { invite_id: input.inviteId, email: input.email },
    companyId: input.companyId,
    actorId: "system",
  });
}
