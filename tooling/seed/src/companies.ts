import { supabase, ignoreConflict } from "./client.js";

export interface SeedCompany {
  id: string;
  name: string;
  slug: string;
  plan: string;
  primary_color: string;
}

export const COMPANIES: SeedCompany[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Meridian Tecnologia",
    slug: "meridian",
    plan: "growth",
    primary_color: "#6366f1",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Atalaia Consultoria",
    slug: "atalaia",
    plan: "starter",
    primary_color: "#10b981",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "Solaris Engenharia",
    slug: "solaris",
    plan: "enterprise",
    primary_color: "#f59e0b",
  },
];

export async function seedCompanies(): Promise<void> {
  console.log("  → Seeding companies...");
  for (const company of COMPANIES) {
    const { error } = await supabase.from("companies").upsert(
      {
        id: company.id,
        name: company.name,
        slug: company.slug,
        plan: company.plan,
        metadata: { primary_color: company.primary_color, seeded: true },
      },
      { onConflict: "id", ignoreDuplicates: false },
    );
    if (error !== null && !ignoreConflict(error)) {
      throw new Error(
        `seed companies.upsert(${company.slug}): ${error.message}`,
      );
    }
  }
  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true });
  console.log(
    `  ✓ ${COMPANIES.length} companies seeded (DB total: ${count ?? "?"}`,
  );
}
