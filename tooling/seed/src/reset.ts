import { supabase } from "./client.js";
import { COMPANIES } from "./companies.js";

// Apaga todos os dados seed. Cuidadoso — só roda contra banco local.
// Deletar companies em cascata remove tudo associado (files, people, chat, etc.)
export async function resetSeed(): Promise<void> {
  console.log("  → Resetting seed data...");

  const companyIds = COMPANIES.map((c) => c.id);

  // Deletar em ordem correta (cascade handle o resto)
  for (const companyId of companyIds) {
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);
    if (error !== null) {
      console.warn(`    warn: companies.delete(${companyId}):`, error.message);
    }
  }

  // Deletar usuários auth — busca pelo email pattern de seed
  const { data: authUsers } = await supabase.auth.admin.listUsers({
    perPage: 100,
  });
  const seedEmails = authUsers?.users.filter(
    (u) =>
      u.email?.endsWith("@meridian.test") ||
      u.email?.endsWith("@atalaia.test") ||
      u.email?.endsWith("@solaris.test"),
  );

  if (seedEmails && seedEmails.length > 0) {
    for (const u of seedEmails) {
      await supabase.auth.admin.deleteUser(u.id);
    }
    console.log(`  ✓ ${seedEmails.length} auth users deleted`);
  }

  console.log("  ✓ Seed reset completo");
}
