import { supabase, ignoreConflict } from "./client.js";
import type { SeedUser } from "./users.js";

const PEOPLE_BY_DEPT: Array<{
  full_name: string;
  email: string;
  phone: string;
  role_label: string;
  department: string;
}> = [
  // Engenharia
  {
    full_name: "Bruno Almeida",
    email: "bruno.almeida@ext.test",
    phone: "+55 11 98000-1001",
    role_label: "Engenheiro de Software",
    department: "Engenharia",
  },
  {
    full_name: "Camila Torres",
    email: "camila.torres@ext.test",
    phone: "+55 11 98000-1002",
    role_label: "Tech Lead",
    department: "Engenharia",
  },
  {
    full_name: "Diego Fonseca",
    email: "diego.fonseca@ext.test",
    phone: "+55 21 98000-1003",
    role_label: "QA Engineer",
    department: "Engenharia",
  },
  {
    full_name: "Elisa Monteiro",
    email: "elisa.monteiro@ext.test",
    phone: "+55 11 98000-1004",
    role_label: "DevOps",
    department: "Engenharia",
  },
  // Vendas
  {
    full_name: "Fábio Correia",
    email: "fabio.correia@ext.test",
    phone: "+55 31 98000-1005",
    role_label: "Account Executive",
    department: "Vendas",
  },
  {
    full_name: "Gabriela Leal",
    email: "gabriela.leal@ext.test",
    phone: "+55 11 98000-1006",
    role_label: "SDR",
    department: "Vendas",
  },
  {
    full_name: "Henrique Prado",
    email: "henrique.prado@ext.test",
    phone: "+55 85 98000-1007",
    role_label: "Gerente Comercial",
    department: "Vendas",
  },
  // RH
  {
    full_name: "Isabela Nunes",
    email: "isabela.nunes@ext.test",
    phone: "+55 41 98000-1008",
    role_label: "People Partner",
    department: "RH",
  },
  {
    full_name: "Júlio Barbosa",
    email: "julio.barbosa@ext.test",
    phone: "+55 11 98000-1009",
    role_label: "Recrutador",
    department: "RH",
  },
  // Financeiro
  {
    full_name: "Karen Silveira",
    email: "karen.silveira@ext.test",
    phone: "+55 11 98000-1010",
    role_label: "Controller",
    department: "Financeiro",
  },
  {
    full_name: "Leonardo Ramos",
    email: "leonardo.ramos@ext.test",
    phone: "+55 61 98000-1011",
    role_label: "Analista Financeiro",
    department: "Financeiro",
  },
  // Marketing
  {
    full_name: "Marina Carvalho",
    email: "marina.carvalho@ext.test",
    phone: "+55 11 98000-1012",
    role_label: "Growth",
    department: "Marketing",
  },
  {
    full_name: "Natália Rocha",
    email: "natalia.rocha@ext.test",
    phone: "+55 21 98000-1013",
    role_label: "Designer",
    department: "Marketing",
  },
  {
    full_name: "Otávio Rezende",
    email: "otavio.rezende@ext.test",
    phone: "+55 51 98000-1014",
    role_label: "Content Lead",
    department: "Marketing",
  },
  {
    full_name: "Priscila Vasconcelos",
    email: "priscila.vasconcelos@ext.test",
    phone: "+55 11 98000-1015",
    role_label: "SEO Specialist",
    department: "Marketing",
  },
  {
    full_name: "Renato Cavalcante",
    email: "renato.cavalcante@ext.test",
    phone: "+55 11 98000-1016",
    role_label: "Paid Media",
    department: "Marketing",
  },
  // Extras
  {
    full_name: "Samantha Guedes",
    email: "samantha.guedes@ext.test",
    phone: "+55 11 98000-1017",
    role_label: "CEO",
    department: "Diretoria",
  },
  {
    full_name: "Thiago Andrade",
    email: "thiago.andrade@ext.test",
    phone: "+55 11 98000-1018",
    role_label: "CTO",
    department: "Diretoria",
  },
  {
    full_name: "Úrsula Medeiros",
    email: "ursula.medeiros@ext.test",
    phone: "+55 11 98000-1019",
    role_label: "CFO",
    department: "Financeiro",
  },
  {
    full_name: "Vinicius Siqueira",
    email: "vinicius.siqueira@ext.test",
    phone: "+55 21 98000-1020",
    role_label: "Estagiário",
    department: "Engenharia",
  },
];

export async function seedPeople(users: SeedUser[]): Promise<void> {
  console.log("  → Seeding people...");

  // Owners por company para usar como created_by
  const ownerByCompany: Record<string, string> = {};
  for (const u of users) {
    if (u.role === "owner") ownerByCompany[u.companyId] = u.authId;
  }

  const companyIds = [...new Set(users.map((u) => u.companyId))];
  let total = 0;

  for (const companyId of companyIds) {
    const owner = ownerByCompany[companyId];
    if (!owner) continue;

    // ~20 pessoas por company, com email único por company (sufixo do companyId)
    const suffix = companyId.slice(-4);
    for (const person of PEOPLE_BY_DEPT) {
      const uniqueEmail = person.email.replace(
        "@ext.test",
        `+${suffix}@ext.test`,
      );
      const { error } = await supabase.from("people").upsert(
        {
          company_id: companyId,
          full_name: person.full_name,
          email: uniqueEmail,
          phone: person.phone,
          role_label: person.role_label,
          department: person.department,
          status: "active",
          metadata: { seeded: true },
        },
        { onConflict: "company_id,email" },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(`seed people.upsert(${uniqueEmail}): ${error.message}`);
      }
      total++;
    }
  }

  console.log(
    `  ✓ ${total} people (~${total / companyIds.length} por company)`,
  );
}
