import { supabase, ignoreConflict } from "./client.js";
import { COMPANIES } from "./companies.js";

export interface SeedUser {
  authId: string;
  email: string;
  displayName: string;
  companySlug: string;
  companyId: string;
  role: "owner" | "admin" | "member";
  position: string;
  department: string;
  isPlatformAdmin?: boolean;
}

const USER_DEFS = [
  // Meridian Tecnologia
  {
    email: "ana.lima@meridian.test",
    displayName: "Ana Lima",
    companySlug: "meridian",
    role: "owner" as const,
    position: "CEO",
    department: "Diretoria",
  },
  {
    email: "carlos.mendes@meridian.test",
    displayName: "Carlos Mendes",
    companySlug: "meridian",
    role: "admin" as const,
    position: "CTO",
    department: "Tecnologia",
  },
  {
    email: "fernanda.souza@meridian.test",
    displayName: "Fernanda Souza",
    companySlug: "meridian",
    role: "member" as const,
    position: "Dev Sênior",
    department: "Tecnologia",
  },
  // Atalaia Consultoria
  {
    email: "rafael.costa@atalaia.test",
    displayName: "Rafael Costa",
    companySlug: "atalaia",
    role: "owner" as const,
    position: "CEO",
    department: "Diretoria",
  },
  {
    email: "mariana.ferreira@atalaia.test",
    displayName: "Mariana Ferreira",
    companySlug: "atalaia",
    role: "member" as const,
    position: "Consultora",
    department: "Operações",
  },
  {
    email: "joao.silva@atalaia.test",
    displayName: "João Silva",
    companySlug: "atalaia",
    role: "member" as const,
    position: "Analista",
    department: "Financeiro",
  },
  // Solaris Engenharia
  {
    email: "patricia.rodrigues@solaris.test",
    displayName: "Patrícia Rodrigues",
    companySlug: "solaris",
    role: "owner" as const,
    position: "Diretora",
    department: "Diretoria",
  },
  {
    email: "lucas.oliveira@solaris.test",
    displayName: "Lucas Oliveira",
    companySlug: "solaris",
    role: "admin" as const,
    position: "Engenheiro Chefe",
    department: "Engenharia",
  },
  {
    email: "amanda.nascimento@solaris.test",
    displayName: "Amanda Nascimento",
    companySlug: "solaris",
    role: "member" as const,
    position: "Engenheira",
    department: "Engenharia",
  },
  // Onboarding Test Co — usuario dedicado para testes E2E de onboarding wizard.
  // Pertence a UMA UNICA company com onboarding_completed=false → login dispara
  // wizard automaticamente em /desktop. Nao mexer.
  {
    email: "onboarding.user@onbtest.test",
    displayName: "Onboarding Test User",
    companySlug: "onbtest",
    role: "owner" as const,
    position: "Founder",
    department: "Diretoria",
  },
];

const SEED_PASSWORD = "Aethereos@2026!";

async function getOrCreateAuthUser(
  email: string,
  displayName: string,
): Promise<string> {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (created?.user) return created.user.id;

  if (error) {
    const { data: list } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    const existing = list?.users.find((u) => u.email === email);
    if (existing) return existing.id;
    throw new Error(
      `Falha ao criar/encontrar usuário ${email}: ${error.message}`,
    );
  }

  throw new Error(`Resposta inesperada ao criar usuário ${email}`);
}

export let SEEDED_USERS: SeedUser[] = [];

export async function seedStaffAdmin(): Promise<string> {
  console.log("  → Seeding staff admin...");

  const staffEmail = "staff@aethereos.test";
  const staffId = await getOrCreateAuthUser(staffEmail, "Platform Admin");

  // Criar/atualizar profile com is_platform_admin=true
  const { error: pe } = await supabase.from("profiles").upsert(
    {
      id: staffId,
      full_name: "Platform Admin",
      phone: null,
      position: "Platform Admin",
      department: "Aethereos",
      is_platform_admin: true,
    },
    { onConflict: "id" },
  );
  if (pe !== null && !ignoreConflict(pe)) {
    throw new Error(`seed profiles.upsert(staff): ${pe.message}`);
  }

  console.log(`  ✓ staff admin: ${staffEmail} (is_platform_admin=true)`);
  return staffId;
}

export async function seedUsers(): Promise<SeedUser[]> {
  console.log("  → Seeding users...");

  const companyBySlug = Object.fromEntries(COMPANIES.map((c) => [c.slug, c]));
  const users: SeedUser[] = [];

  for (const def of USER_DEFS) {
    const company = companyBySlug[def.companySlug];
    if (!company) throw new Error(`Company not found: ${def.companySlug}`);

    const authId = await getOrCreateAuthUser(def.email, def.displayName);

    // kernel.users (legado — mantido por compatibilidade com queries existentes)
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
      throw new Error(`seed kernel.users.upsert(${def.email}): ${ku.message}`);
    }

    // profiles
    const { error: prof } = await supabase.from("profiles").upsert(
      {
        id: authId,
        full_name: def.displayName,
        position: def.position,
        department: def.department,
        is_platform_admin: false,
      },
      { onConflict: "id" },
    );
    if (prof !== null && !ignoreConflict(prof)) {
      throw new Error(`seed profiles.upsert(${def.email}): ${prof.message}`);
    }

    // tenant_memberships (com status)
    const { error: tm } = await supabase.from("tenant_memberships").upsert(
      {
        user_id: authId,
        company_id: company.id,
        role: def.role,
        status: "active",
      },
      { onConflict: "user_id,company_id" },
    );
    if (tm !== null && !ignoreConflict(tm)) {
      throw new Error(
        `seed tenant_memberships.upsert(${def.email}): ${tm.message}`,
      );
    }

    // employees (invariante: todo user com membership ativa deve ter employee)
    // partial unique index (where user_id IS NOT NULL) — não suporta onConflict via PostgREST
    // usa insert simples: conflito (23505) = idempotente, outros erros = falha
    const { error: emp } = await supabase.from("employees").insert({
      company_id: company.id,
      user_id: authId,
      full_name: def.displayName,
      email: def.email,
      corporate_email: def.email,
      position: def.position,
      department: def.department,
      status: "active",
      hire_date: "2025-01-01",
      created_by: authId,
    });
    if (emp !== null && !ignoreConflict(emp)) {
      throw new Error(`seed employees.insert(${def.email}): ${emp.message}`);
    }

    users.push({ ...def, authId, companyId: company.id });
  }

  SEEDED_USERS = users;

  const { count: empCount } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true });
  const { count: profCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  console.log(
    `  ✓ ${users.length} users | profiles DB: ${profCount ?? "?"} | employees DB: ${empCount ?? "?"}`,
  );
  return users;
}
