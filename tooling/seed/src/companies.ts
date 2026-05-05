import { supabase, ignoreConflict } from "./client.js";

export interface SeedCompany {
  id: string;
  name: string;
  slug: string;
  plan: string;
  cnpj: string;
  trade_name: string;
  primary_color: string;
  onboarding_completed?: boolean;
}

// CNPJs fictícios estruturalmente válidos para seed (não são CNPJs reais ativos)
export const COMPANIES: SeedCompany[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Meridian Tecnologia LTDA",
    slug: "meridian",
    plan: "pro",
    cnpj: "12345678000195",
    trade_name: "Meridian Tech",
    primary_color: "#6366f1",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Atalaia Consultoria S/A",
    slug: "atalaia",
    plan: "starter",
    cnpj: "23456789000108",
    trade_name: "Atalaia Consultoria",
    primary_color: "#10b981",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "Solaris Engenharia EIRELI",
    slug: "solaris",
    plan: "enterprise",
    cnpj: "34567890000145",
    trade_name: "Solaris Engenharia",
    primary_color: "#f59e0b",
  },
  {
    id: "10000000-0000-0000-0000-000000000099",
    name: "Onboarding Test Co LTDA",
    slug: "onbtest",
    plan: "starter",
    cnpj: "99999999000199",
    trade_name: "Onboarding Test",
    primary_color: "#a855f7",
    onboarding_completed: false,
  },
];

const FAKE_CNPJ_DATA = (c: SeedCompany) => ({
  cnpj: c.cnpj,
  razao_social: c.name,
  nome_fantasia: c.trade_name,
  situacao: "ATIVA",
  atividade_principal: "Atividades de desenvolvimento de software",
  logradouro: "Avenida Paulista",
  numero: "1000",
  complemento: "Sala 100",
  bairro: "Bela Vista",
  municipio: "São Paulo",
  uf: "SP",
  cep: "01310100",
  telefone: "11999999999",
  email: null,
  _seeded: true,
});

export async function seedCompanies(): Promise<void> {
  console.log("  → Seeding companies...");
  for (const company of COMPANIES) {
    const { error } = await supabase.from("companies").upsert(
      {
        id: company.id,
        name: company.name,
        slug: company.slug,
        plan: company.plan,
        status: "active",
        cnpj: company.cnpj,
        trade_name: company.trade_name,
        cnpj_data: FAKE_CNPJ_DATA(company),
        onboarding_completed: company.onboarding_completed ?? true,
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

  // Sprint 16 MX81: modulos kernel padrao instalados em toda nova company.
  // Apps utilitarios basicos que TODA empresa usa, independente de vertical.
  // Verticais (comercio_digital, logitix, erp) NAO sao auto-seedados —
  // o usuario instala explicitamente via Magic Store quando precisar.
  // Idempotente: ignoreDuplicates evita conflito em re-runs e preserva
  // modulos extras que companies existentes ja tenham instalado.
  const KERNEL_DEFAULT_MODULES = [
    "drive",
    "chat",
    "settings",
    "rh",
    "calendar",
    "tarefas",
    "bloco-de-notas",
    "calculadora",
    "relogio",
  ];

  for (const company of COMPANIES) {
    for (const module of KERNEL_DEFAULT_MODULES) {
      const { error } = await supabase
        .from("company_modules")
        .upsert(
          { company_id: company.id, module, status: "active" },
          { onConflict: "company_id,module", ignoreDuplicates: true },
        );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(
          `seed company_modules.upsert(${company.slug}/${module}): ${error.message}`,
        );
      }
    }
  }

  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true });
  console.log(
    `  ✓ ${COMPANIES.length} companies seeded (DB total: ${count ?? "?"})`,
  );
}
