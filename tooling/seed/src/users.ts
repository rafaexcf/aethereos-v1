import { supabase, ignoreConflict } from "./client.js";
import { COMPANIES } from "./companies.js";

export interface SeedUser {
  authId: string; // preenchido após criação/lookup
  email: string;
  displayName: string;
  companySlug: string;
  companyId: string;
  role: "owner" | "admin" | "member";
}

// Definição antes de conhecer o authId
const USER_DEFS = [
  // Meridian Tecnologia
  {
    email: "ana.lima@meridian.test",
    displayName: "Ana Lima",
    companySlug: "meridian",
    role: "owner" as const,
  },
  {
    email: "carlos.mendes@meridian.test",
    displayName: "Carlos Mendes",
    companySlug: "meridian",
    role: "admin" as const,
  },
  {
    email: "fernanda.souza@meridian.test",
    displayName: "Fernanda Souza",
    companySlug: "meridian",
    role: "member" as const,
  },
  // Atalaia Consultoria
  {
    email: "rafael.costa@atalaia.test",
    displayName: "Rafael Costa",
    companySlug: "atalaia",
    role: "owner" as const,
  },
  {
    email: "mariana.ferreira@atalaia.test",
    displayName: "Mariana Ferreira",
    companySlug: "atalaia",
    role: "member" as const,
  },
  {
    email: "joao.silva@atalaia.test",
    displayName: "João Silva",
    companySlug: "atalaia",
    role: "member" as const,
  },
  // Solaris Engenharia
  {
    email: "patricia.rodrigues@solaris.test",
    displayName: "Patrícia Rodrigues",
    companySlug: "solaris",
    role: "owner" as const,
  },
  {
    email: "lucas.oliveira@solaris.test",
    displayName: "Lucas Oliveira",
    companySlug: "solaris",
    role: "admin" as const,
  },
  {
    email: "amanda.nascimento@solaris.test",
    displayName: "Amanda Nascimento",
    companySlug: "solaris",
    role: "member" as const,
  },
];

const SEED_PASSWORD = "Aethereos@2026!";

async function getOrCreateAuthUser(
  email: string,
  displayName: string,
): Promise<string> {
  // Tenta criar o usuário auth
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (created?.user) return created.user.id;

  // Se conflito (já existe), busca via RPC ou auth.users
  if (error) {
    // Busca o usuário existente pelo email na tabela auth.users via schema público
    const { data: existing } = await (supabase
      .schema("auth" as never)
      .from("users")
      .select("id")
      .eq("email", email)
      .single() as unknown as Promise<{
      data: { id: string } | null;
      error: unknown;
    }>);
    if (existing !== null) return existing.id;
    throw new Error(
      `Falha ao criar/encontrar usuário ${email}: ${error.message}`,
    );
  }

  throw new Error(`Resposta inesperada ao criar usuário ${email}`);
}

export let SEEDED_USERS: SeedUser[] = [];

export async function seedUsers(): Promise<SeedUser[]> {
  console.log("  → Seeding users...");

  const companyBySlug = Object.fromEntries(COMPANIES.map((c) => [c.slug, c]));
  const users: SeedUser[] = [];

  for (const def of USER_DEFS) {
    const company = companyBySlug[def.companySlug];
    if (!company) throw new Error(`Company not found: ${def.companySlug}`);

    const authId = await getOrCreateAuthUser(def.email, def.displayName);

    // kernel.users (schema já configurado no client)
    const { error: ku } = await supabase.from("users").upsert(
      {
        id: authId,
        company_id: company.id,
        email: def.email,
        display_name: def.displayName,
        role: def.role,
        status: "active",
      },
      { onConflict: "id" },
    );
    if (ku !== null && !ignoreConflict(ku)) {
      console.warn(`    warn: kernel.users.upsert(${def.email}):`, ku.message);
    }

    // tenant_memberships
    const { error: tm } = await supabase.from("tenant_memberships").upsert(
      {
        user_id: authId,
        company_id: company.id,
        role: def.role,
      },
      { onConflict: "user_id,company_id" },
    );
    if (tm !== null && !ignoreConflict(tm)) {
      console.warn(
        `    warn: tenant_memberships.upsert(${def.email}):`,
        tm.message,
      );
    }

    users.push({ ...def, authId, companyId: company.id });
  }

  SEEDED_USERS = users;
  console.log(`  ✓ ${users.length} users`);
  return users;
}
