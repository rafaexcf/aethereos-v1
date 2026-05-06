/**
 * Seed data para testes manuais da Camada 1 (Sprint 9 MX20)
 *
 * Uso:
 *   pnpm seed:dev          → popula banco local
 *   pnpm seed:reset        → apaga dados seed (apenas banco local)
 *
 * Segurança: recusa rodar se SUPABASE_URL não for localhost.
 * Idempotência: upsert em toda entidade; rodar 2x não duplica.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvLocal(): void {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const envPath = resolve(dir, "../../../.env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local pode não existir — variáveis devem estar no ambiente
  }
}

loadEnvLocal();

const isReset = process.argv.includes("--reset");

async function main(): Promise<void> {
  console.log(`\nAethereos Seed — ${isReset ? "RESET" : "POPULATE"}`);
  console.log(`URL: ${process.env["SUPABASE_URL"] ?? "(não definida)"}\n`);

  if (isReset) {
    const { resetSeed } = await import("./reset.js");
    await resetSeed();
    console.log("\nSeed reset concluído.\n");
    return;
  }

  const { seedCompanies } = await import("./companies.js");
  const { seedUsers, seedStaffAdmin } = await import("./users.js");
  const { seedPeople } = await import("./people.js");
  const { seedFiles } = await import("./files.js");
  const { seedChat } = await import("./chat.js");
  const { seedProposals } = await import("./proposals.js");

  console.log("Passo 1: Companies + modules");
  await seedCompanies();

  console.log("\nPasso 2: Staff admin");
  await seedStaffAdmin();

  console.log("\nPasso 3: Users + profiles + memberships + employees");
  const users = await seedUsers();

  console.log("\nPasso 4: People");
  await seedPeople(users);

  console.log("\nPasso 5: Files");
  await seedFiles(users);

  console.log("\nPasso 6: Chat");
  await seedChat(users);

  console.log("\nPasso 7: Copilot proposals");
  await seedProposals(users);

  console.log(
    "\nPasso 8: Departments, groups, roles, tasks, kanban, notes, grants (Sprint 33 MX181)",
  );
  const { seedExtras } = await import("./extras.js");
  await seedExtras({ users });

  // Validação pós-seed: conta registros reais no banco
  console.log("\nValidação pós-seed (contagem real no banco):");
  const { supabase: sb } = await import("./client.js");
  const tables = [
    "companies",
    "profiles",
    "employees",
    "tenant_memberships",
    "company_modules",
    "users",
    "people",
    "files",
    "chat_channels",
    "chat_messages",
    "agent_proposals",
    "departments",
    "department_members",
    "groups",
    "group_members",
    "company_roles",
    "tasks",
    "kanban_boards",
    "kanban_columns",
    "kanban_cards",
    "notes",
    "app_permission_grants",
  ];
  for (const tbl of tables) {
    const { count, error: ce } = await sb
      .from(tbl)
      .select("*", { count: "exact", head: true });
    if (ce !== null) {
      console.error(`  ✗ ${tbl}: erro na contagem — ${ce.message}`);
      process.exit(1);
    }
    console.log(`  ${tbl}: ${count ?? 0} registros`);
  }

  console.log("\n✅ Seed completo!\n");
  console.log("Usuários de teste (senha: Aethereos@2026!):");
  console.log("  Platform:  staff@aethereos.test (is_platform_admin=true)");
  console.log("  Meridian:  ana.lima@meridian.test (owner)");
  console.log("  Atalaia:   rafael.costa@atalaia.test (owner)");
  console.log("  Solaris:   patricia.rodrigues@solaris.test (owner)");
}

main().catch((err: unknown) => {
  console.error("\n❌ Seed falhou:", err);
  process.exit(1);
});
