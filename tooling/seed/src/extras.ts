/**
 * Seed extras (Sprint 33 MX181) — entidades adicionadas pós-Sprint 9:
 *   - departments + department_members
 *   - groups + group_members
 *   - company_roles
 *   - tasks (por owner)
 *   - kanban_boards + columns + cards (por owner)
 *   - notes (por owner)
 *   - app_permission_grants (apps padrão pré-aprovados)
 *
 * Idempotente: upserts com onConflict; conflitos de unique são ignorados.
 * Per-user: tasks/kanban/notes são RLS por user_id, então só seed para o
 * owner de cada company para manter o seed mínimo e reproduzível.
 */

import type { SeedUser } from "./users.js";
import { COMPANIES } from "./companies.js";
import { supabase, ignoreConflict } from "./client.js";

interface SeedContext {
  users: SeedUser[];
}

const DEPARTMENTS_BY_COMPANY = [
  "Diretoria",
  "Tecnologia",
  "Operações",
  "Financeiro",
];

const GROUPS_BY_COMPANY = ["Squad Camada 1", "Comitê de Inovação"];

const COMPANY_ROLES = [
  { label: "Engenheiro", base_role: "member", description: "Time de Tech" },
  { label: "Líder", base_role: "manager", description: "Liderança técnica" },
  {
    label: "Estagiário",
    base_role: "viewer",
    description: "Acesso somente leitura",
  },
];

const SEED_TASKS = [
  {
    title: "Revisar PRs do dia",
    priority: "medium" as const,
    status: "pending" as const,
  },
  {
    title: "Sincronizar com squad",
    priority: "low" as const,
    status: "pending" as const,
  },
  {
    title: "Atualizar documentação SCP",
    priority: "high" as const,
    status: "pending" as const,
  },
  {
    title: "Validar deploy de staging",
    priority: "urgent" as const,
    status: "completed" as const,
  },
  {
    title: "Configurar 2FA",
    priority: "medium" as const,
    status: "completed" as const,
  },
];

const SEED_NOTES = [
  { title: "Roadmap Camada 1", content: "Itens pendentes para selo final" },
  {
    title: "Reunião de squad",
    content: "Tópicos:\n- Status sprint\n- Bloqueios\n- Próximos passos",
  },
  { title: "Ideias para comercio.digital", content: "Brainstorm livre" },
];

const KANBAN_BOARD = {
  name: "Sprint Atual",
  description: "Board de acompanhamento da sprint",
  color: "#6366f1",
};

const KANBAN_COLUMNS = [
  { name: "A fazer", position: 1000 },
  { name: "Em andamento", position: 2000 },
  { name: "Concluído", position: 3000 },
];

const KANBAN_CARDS = [
  { title: "Implementar feature X", priority: "high" as const, columnIdx: 0 },
  { title: "Corrigir bug Y", priority: "medium" as const, columnIdx: 0 },
  { title: "Code review da PR Z", priority: "medium" as const, columnIdx: 1 },
  { title: "Refatorar god component", priority: "low" as const, columnIdx: 1 },
  { title: "Documentar runbook", priority: "low" as const, columnIdx: 2 },
  { title: "Sprint planning", priority: "medium" as const, columnIdx: 2 },
];

// Apps que toda company tem grant default por estarem em KERNEL_DEFAULT_MODULES.
// Mantém alinhado com seed de companies.ts.
const DEFAULT_APP_GRANTS = [
  { appId: "drive", scopes: ["files.read", "files.write"] },
  { appId: "chat", scopes: ["chat.read", "chat.write"] },
  { appId: "tarefas", scopes: ["tasks.read", "tasks.write"] },
  { appId: "bloco-de-notas", scopes: ["notes.read", "notes.write"] },
];

export async function seedDepartments(): Promise<void> {
  console.log("  → Seeding departments + members...");
  let totalDept = 0;
  let totalMembers = 0;
  for (const company of COMPANIES) {
    for (const name of DEPARTMENTS_BY_COMPANY) {
      const id = deterministicUuid(company.id, "dept", name);
      const { error } = await supabase.from("departments").upsert(
        {
          id,
          company_id: company.id,
          name,
          description: `Departamento ${name}`,
        },
        { onConflict: "id" },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(
          `seed departments(${company.slug}/${name}): ${error.message}`,
        );
      }
      totalDept += 1;
    }
  }

  // Member: associa cada user ao departamento que bate com seu profile.department.
  const { data: depts } = await supabase
    .from("departments")
    .select("id, name, company_id");
  if (!depts) throw new Error("seed departments: select retornou null");
  const deptByKey = new Map<string, string>();
  for (const d of depts as Array<{
    id: string;
    name: string;
    company_id: string;
  }>) {
    deptByKey.set(`${d.company_id}|${d.name}`, d.id);
  }

  // Não temos lista de profiles aqui — buscamos via API.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, department");
  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, company_id, status")
    .eq("status", "active");

  if (profiles && memberships) {
    for (const m of memberships as Array<{
      user_id: string;
      company_id: string;
    }>) {
      const prof = (
        profiles as Array<{ id: string; department: string | null }>
      ).find((p) => p.id === m.user_id);
      if (!prof || !prof.department) continue;
      const deptId = deptByKey.get(`${m.company_id}|${prof.department}`);
      if (!deptId) continue;
      const { error } = await supabase.from("department_members").upsert(
        {
          company_id: m.company_id,
          department_id: deptId,
          user_id: m.user_id,
        },
        { onConflict: "department_id,user_id", ignoreDuplicates: true },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(
          `seed department_members(${m.user_id}): ${error.message}`,
        );
      }
      totalMembers += 1;
    }
  }
  console.log(`  ✓ ${totalDept} departments, ${totalMembers} members`);
}

export async function seedGroups({ users }: SeedContext): Promise<void> {
  console.log("  → Seeding groups + members...");
  let totalGroups = 0;
  let totalMembers = 0;
  for (const company of COMPANIES) {
    for (const name of GROUPS_BY_COMPANY) {
      const id = deterministicUuid(company.id, "group", name);
      const { error } = await supabase.from("groups").upsert(
        {
          id,
          company_id: company.id,
          name,
          description: `Grupo ${name}`,
        },
        { onConflict: "id" },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(
          `seed groups(${company.slug}/${name}): ${error.message}`,
        );
      }
      totalGroups += 1;

      // Adiciona owner do company ao primeiro grupo.
      if (name === GROUPS_BY_COMPANY[0]) {
        const ownersOfCompany = users.filter(
          (u) => u.companyId === company.id && u.role === "owner",
        );
        for (const owner of ownersOfCompany) {
          const { error: gmErr } = await supabase.from("group_members").upsert(
            {
              company_id: company.id,
              group_id: id,
              user_id: owner.authId,
            },
            { onConflict: "group_id,user_id", ignoreDuplicates: true },
          );
          if (gmErr !== null && !ignoreConflict(gmErr)) {
            throw new Error(
              `seed group_members(${owner.email}): ${gmErr.message}`,
            );
          }
          totalMembers += 1;
        }
      }
    }
  }
  console.log(`  ✓ ${totalGroups} groups, ${totalMembers} members`);
}

export async function seedCompanyRoles(): Promise<void> {
  console.log("  → Seeding company_roles...");
  let total = 0;
  for (const company of COMPANIES) {
    for (const role of COMPANY_ROLES) {
      const id = deterministicUuid(company.id, "role", role.label);
      const { error } = await supabase.from("company_roles").upsert(
        {
          id,
          company_id: company.id,
          label: role.label,
          maps_to_role: role.base_role,
        },
        { onConflict: "id" },
      );
      if (error !== null && !ignoreConflict(error)) {
        // Migration 20260506000001 aliasa company_roles para usar base_role+description.
        // Se onConflict falhar por schema diferente, tenta variante.
        const { error: e2 } = await supabase.from("company_roles").upsert(
          {
            id,
            company_id: company.id,
            label: role.label,
            base_role: role.base_role,
            description: role.description,
          },
          { onConflict: "id" },
        );
        if (e2 !== null && !ignoreConflict(e2)) {
          console.warn(
            `  ⚠ skip company_roles(${company.slug}/${role.label}): ${e2.message}`,
          );
          continue;
        }
      }
      total += 1;
    }
  }
  console.log(`  ✓ ${total} company_roles`);
}

export async function seedTasks({ users }: SeedContext): Promise<void> {
  console.log("  → Seeding tasks (per company owner)...");
  let total = 0;
  for (const company of COMPANIES) {
    const owner = users.find(
      (u) => u.companyId === company.id && u.role === "owner",
    );
    if (!owner) continue;
    for (let i = 0; i < SEED_TASKS.length; i++) {
      const task = SEED_TASKS[i];
      if (task === undefined) continue;
      const id = deterministicUuid(owner.authId, "task", String(i));
      const { error } = await supabase.from("tasks").upsert(
        {
          id,
          user_id: owner.authId,
          company_id: company.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          position: i * 100,
          completed_at:
            task.status === "completed" ? new Date().toISOString() : null,
        },
        { onConflict: "id" },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(
          `seed tasks(${owner.email}/${task.title}): ${error.message}`,
        );
      }
      total += 1;
    }
  }
  console.log(`  ✓ ${total} tasks`);
}

export async function seedKanban({ users }: SeedContext): Promise<void> {
  console.log("  → Seeding kanban (per company owner)...");
  let totalBoards = 0;
  let totalCols = 0;
  let totalCards = 0;
  for (const company of COMPANIES) {
    const owner = users.find(
      (u) => u.companyId === company.id && u.role === "owner",
    );
    if (!owner) continue;
    const boardId = deterministicUuid(owner.authId, "board", "main");

    const { error: bErr } = await supabase.from("kanban_boards").upsert(
      {
        id: boardId,
        user_id: owner.authId,
        company_id: company.id,
        name: KANBAN_BOARD.name,
        description: KANBAN_BOARD.description,
        color: KANBAN_BOARD.color,
      },
      { onConflict: "id" },
    );
    if (bErr !== null && !ignoreConflict(bErr)) {
      throw new Error(`seed kanban_boards(${owner.email}): ${bErr.message}`);
    }
    totalBoards += 1;

    const columnIds: string[] = [];
    for (let i = 0; i < KANBAN_COLUMNS.length; i++) {
      const col = KANBAN_COLUMNS[i];
      if (col === undefined) continue;
      const colId = deterministicUuid(boardId, "col", String(i));
      const { error } = await supabase.from("kanban_columns").upsert(
        {
          id: colId,
          board_id: boardId,
          user_id: owner.authId,
          company_id: company.id,
          name: col.name,
          position: col.position,
        },
        { onConflict: "id" },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(`seed kanban_columns(${col.name}): ${error.message}`);
      }
      columnIds.push(colId);
      totalCols += 1;
    }

    for (let i = 0; i < KANBAN_CARDS.length; i++) {
      const card = KANBAN_CARDS[i];
      if (card === undefined) continue;
      const colId = columnIds[card.columnIdx];
      if (!colId) continue;
      const cardId = deterministicUuid(boardId, "card", String(i));
      const { error } = await supabase.from("kanban_cards").upsert(
        {
          id: cardId,
          board_id: boardId,
          column_id: colId,
          user_id: owner.authId,
          company_id: company.id,
          title: card.title,
          priority: card.priority,
          status: card.columnIdx === 2 ? "completed" : "active",
          position: i * 100,
        },
        { onConflict: "id" },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(`seed kanban_cards(${card.title}): ${error.message}`);
      }
      totalCards += 1;
    }
  }
  console.log(
    `  ✓ ${totalBoards} boards, ${totalCols} columns, ${totalCards} cards`,
  );
}

export async function seedNotes({ users }: SeedContext): Promise<void> {
  console.log("  → Seeding notes (per company owner)...");
  let total = 0;
  for (const company of COMPANIES) {
    const owner = users.find(
      (u) => u.companyId === company.id && u.role === "owner",
    );
    if (!owner) continue;
    for (let i = 0; i < SEED_NOTES.length; i++) {
      const note = SEED_NOTES[i];
      if (note === undefined) continue;
      const id = deterministicUuid(owner.authId, "note", String(i));
      const { error } = await supabase.from("notes").upsert(
        {
          id,
          user_id: owner.authId,
          company_id: company.id,
          title: note.title,
          content: note.content,
        },
        { onConflict: "id" },
      );
      if (error !== null && !ignoreConflict(error)) {
        throw new Error(
          `seed notes(${owner.email}/${note.title}): ${error.message}`,
        );
      }
      total += 1;
    }
  }
  console.log(`  ✓ ${total} notes`);
}

export async function seedAppPermissionGrants({
  users,
}: SeedContext): Promise<void> {
  console.log("  → Seeding app_permission_grants (default apps)...");
  let total = 0;
  for (const company of COMPANIES) {
    const owner = users.find(
      (u) => u.companyId === company.id && u.role === "owner",
    );
    if (!owner) continue;
    for (const grant of DEFAULT_APP_GRANTS) {
      // Verifica se app_id existe no registry — caso seed rode antes do seed do registry.
      const { data: appRow } = await supabase
        .from("app_registry")
        .select("id")
        .eq("id", grant.appId)
        .maybeSingle();
      if (!appRow) continue;
      for (const scope of grant.scopes) {
        const { error } = await supabase.from("app_permission_grants").upsert(
          {
            company_id: company.id,
            app_id: grant.appId,
            scope,
            granted_by: owner.authId,
          },
          { onConflict: "company_id,app_id,scope", ignoreDuplicates: true },
        );
        if (error !== null && !ignoreConflict(error)) {
          console.warn(
            `  ⚠ skip app_permission_grants(${company.slug}/${grant.appId}/${scope}): ${error.message}`,
          );
          continue;
        }
        total += 1;
      }
    }
  }
  console.log(`  ✓ ${total} grants`);
}

export async function seedExtras(ctx: SeedContext): Promise<void> {
  await seedDepartments();
  await seedGroups(ctx);
  await seedCompanyRoles();
  await seedTasks(ctx);
  await seedKanban(ctx);
  await seedNotes(ctx);
  await seedAppPermissionGrants(ctx);
}

// Gera UUID v5-like determinístico a partir de seed de strings — não-criptográfico,
// só precisa ser estável entre runs para idempotência. Usa hash simples.
function deterministicUuid(...parts: string[]): string {
  const input = parts.join("|");
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  // Formato UUID 8-4-4-4-12. Reusa hash duas vezes para preencher 32 hex.
  return `${a.slice(0, 8)}-${a.slice(0, 4)}-4${a.slice(1, 4)}-${b.slice(0, 4)}-${b}${a.slice(0, 4)}`;
}
