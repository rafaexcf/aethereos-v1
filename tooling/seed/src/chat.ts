import { supabase, ignoreConflict } from "./client.js";
import type { SeedUser } from "./users.js";

const CHANNEL_DEFS = [
  { name: "geral", kind: "channel" as const },
  { name: "engenharia", kind: "channel" as const },
  { name: "avisos", kind: "channel" as const },
];

const MESSAGES_TEMPLATE = [
  "Pessoal, vamos alinhar o roadmap da próxima sprint?",
  "Alguém conseguiu reproduzir aquele bug no módulo de relatórios?",
  "Reunião de planning confirmada para sexta às 10h.",
  "Atualizei a documentação da API no Drive — confiram!",
  "Qual o status do deploy de hoje?",
  "Precisamos revisar as métricas de conversão do Q1.",
  "Novos contratos chegaram — aprovar até quinta-feira.",
  "Sistema de alertas configurado. Notificações ativas.",
  "Onboarding do novo engenheiro na segunda-feira.",
  "Alguém viu o relatório financeiro que o Lucas subiu?",
];

export async function seedChat(users: SeedUser[]): Promise<void> {
  console.log("  → Seeding chat channels & messages...");

  const companyIds = [...new Set(users.map((u) => u.companyId))];
  let totalChannels = 0;
  let totalMessages = 0;

  for (const companyId of companyIds) {
    const companyUsers = users.filter((u) => u.companyId === companyId);
    const owner = companyUsers.find((u) => u.role === "owner");
    if (!owner) continue;

    for (const channelDef of CHANNEL_DEFS) {
      // Create channel
      const { data: channelData, error: channelError } = await (supabase
        .from("chat_channels")
        .upsert(
          {
            company_id: companyId,
            name: channelDef.name,
            kind: channelDef.kind,
            created_by: owner.authId,
          },
          { onConflict: "company_id,name" },
        )
        .select("id")
        .single() as unknown as Promise<{
        data: { id: string } | null;
        error: { message: string; code?: string } | null;
      }>);

      if (channelError !== null) {
        if (!ignoreConflict(channelError)) {
          console.warn(
            `    warn: chat_channels.upsert(${channelDef.name}):`,
            channelError.message,
          );
        }
        continue;
      }

      if (channelData === null) continue;
      const channelId = channelData.id;
      totalChannels++;

      // Add all company users as members
      for (const user of companyUsers) {
        await supabase
          .from("chat_channel_members")
          .upsert(
            { channel_id: channelId, user_id: user.authId },
            { onConflict: "channel_id,user_id" },
          );
      }

      // Insert 5-10 messages distributed across users
      const messageCount = Math.min(MESSAGES_TEMPLATE.length, 7);
      for (let i = 0; i < messageCount; i++) {
        const sender = companyUsers[i % companyUsers.length];
        if (!sender) continue;
        const body = MESSAGES_TEMPLATE[i] ?? "Mensagem de teste.";

        const { error: msgError } = await supabase
          .from("chat_messages")
          .insert({
            channel_id: channelId,
            sender_user_id: sender.authId,
            body,
            metadata: { seeded: true },
          });

        if (msgError !== null) {
          console.warn(`    warn: chat_messages.insert:`, msgError.message);
        } else {
          totalMessages++;
        }
      }
    }
  }

  console.log(`  ✓ ${totalChannels} channels, ${totalMessages} messages`);
}
