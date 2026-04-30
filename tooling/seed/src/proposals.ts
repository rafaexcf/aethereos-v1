import { supabase, ignoreConflict } from "./client.js";
import type { SeedUser } from "./users.js";

// Propostas Copilot com status variados para que o tester veja diferentes estados
const PROPOSAL_TEMPLATES = [
  {
    intent_type: "create_person",
    payload: {
      intent_type: "create_person",
      full_name: "Eduardo Martins",
      email: "eduardo@example.test",
      source_request: "adicionar pessoa no RH",
    },
    status: "pending" as const,
  },
  {
    intent_type: "create_file",
    payload: {
      intent_type: "create_file",
      name: "Relatório de Desempenho",
      kind: "folder",
      source_request: "criar pasta para relatórios",
    },
    status: "approved" as const,
  },
  {
    intent_type: "send_notification",
    payload: {
      intent_type: "send_notification",
      title: "Reunião de Planning",
      body: "Planning da sprint 10 amanhã às 10h",
      type: "info",
    },
    status: "rejected" as const,
  },
  {
    intent_type: "create_channel",
    payload: {
      intent_type: "create_channel",
      name: "design",
      kind: "channel",
      source_request: "criar canal para design",
    },
    status: "pending" as const,
  },
  {
    intent_type: "update_settings",
    payload: {
      intent_type: "update_settings",
      scope: "company",
      key: "notifications.email_digest",
      source_request: "configurar digest por email",
    },
    status: "approved" as const,
  },
];

export async function seedProposals(users: SeedUser[]): Promise<void> {
  console.log("  → Seeding copilot proposals...");

  const companyIds = [...new Set(users.map((u) => u.companyId))];
  let total = 0;

  for (const companyId of companyIds) {
    const companyUsers = users.filter((u) => u.companyId === companyId);
    const owner = companyUsers.find((u) => u.role === "owner");
    if (!owner) continue;

    // Find or create copilot agent for this company
    const { data: agentData } = await (supabase
      .from("agents")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", "Copilot")
      .limit(1)
      .maybeSingle() as unknown as Promise<{
      data: { id: string } | null;
      error: unknown;
    }>);

    let agentId: string;
    if (agentData !== null) {
      agentId = agentData.id;
    } else {
      const { data: newAgent } = await (supabase
        .from("agents")
        .insert({
          company_id: companyId,
          supervising_user_id: owner.authId,
          name: "Copilot",
          description: "AI Copilot assistivo (Shadow Mode, autonomia 0-1)",
          capabilities: ["read", "propose"],
          kind: "copilot",
          autonomy_level: 0,
        })
        .select("id")
        .single() as unknown as Promise<{
        data: { id: string } | null;
        error: unknown;
      }>);
      if (newAgent === null) continue;
      agentId = newAgent.id;
    }

    // Find or create a conversation for seed proposals
    const convId = crypto.randomUUID();
    await supabase.from("copilot_conversations").insert({
      id: convId,
      company_id: companyId,
      agent_id: agentId,
      user_id: owner.authId,
      title: "Conversa de demonstração",
    });

    for (const tmpl of PROPOSAL_TEMPLATES) {
      const { error } = await supabase.from("agent_proposals").insert({
        company_id: companyId,
        agent_id: agentId,
        conversation_id: convId,
        supervising_user_id: owner.authId,
        intent_type: tmpl.intent_type,
        payload: tmpl.payload,
        status: tmpl.status,
        ...(tmpl.status !== "pending"
          ? {
              reviewed_by: owner.authId,
              reviewed_at: new Date().toISOString(),
            }
          : {}),
      });
      if (error !== null && !ignoreConflict(error)) {
        console.warn(
          `    warn: agent_proposals.insert(${tmpl.intent_type}):`,
          error.message,
        );
      } else {
        total++;
      }
    }
  }

  console.log(`  ✓ ${total} proposals (${companyIds.length} companies × 5)`);
}
