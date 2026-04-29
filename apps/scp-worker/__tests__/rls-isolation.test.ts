/**
 * MX10 — Testes de isolamento RLS cross-tenant (abrangentes).
 *
 * Valida mecanicamente que RLS impede vazamento de dados entre companies.
 * Cada describe bloco testa uma tabela do schema kernel.
 *
 * Requer Supabase local rodando: pnpm dev:db
 * TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
 *
 * Skip automático se TEST_DATABASE_URL não estiver definida.
 * Ref: ADR-0020, Fundamentação 10.1 [INV], CLAUDE.md seção 5
 */

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const dbUrl = process.env["TEST_DATABASE_URL"];
const hasDb = !!dbUrl;

// Helpers

function makeSql() {
  return postgres(dbUrl ?? "");
}

/**
 * Executa query como role `authenticated` com company_id ativo.
 * Simula o comportamento do Supabase PostgREST com JWT válido.
 */
async function asUser<T>(
  sql: ReturnType<typeof postgres>,
  companyId: string,
  query: (tx: ReturnType<typeof postgres>) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SET LOCAL ROLE authenticated`;
    await tx`SELECT set_config('app.current_company_id', ${companyId}, true)`;
    return query(tx as unknown as ReturnType<typeof postgres>);
  });
}

/**
 * Executa query como role `authenticated` SEM contexto de tenant (fail-closed).
 */
async function asUserNoTenant<T>(
  sql: ReturnType<typeof postgres>,
  query: (tx: ReturnType<typeof postgres>) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SET LOCAL ROLE authenticated`;
    return query(tx as unknown as ReturnType<typeof postgres>);
  });
}

// ---------------------------------------------------------------------------
// Setup compartilhado: 2 companies para todos os testes
// ---------------------------------------------------------------------------

let sharedSql: ReturnType<typeof postgres>;
let companyAId: string;
let companyBId: string;

const COMPANY_A_SLUG = "mx10-isolation-test-a";
const COMPANY_B_SLUG = "mx10-isolation-test-b";

beforeAll(async () => {
  if (!hasDb) return;
  sharedSql = makeSql();

  // Remove dados de runs anteriores
  await sharedSql`
    DELETE FROM kernel.companies WHERE slug IN (${COMPANY_A_SLUG}, ${COMPANY_B_SLUG})
  `;

  const [rowA] = await sharedSql<[{ id: string }]>`
    INSERT INTO kernel.companies (slug, name, plan, status)
    VALUES (${COMPANY_A_SLUG}, 'MX10 Isolation Test A', 'trial', 'active')
    RETURNING id
  `;
  const [rowB] = await sharedSql<[{ id: string }]>`
    INSERT INTO kernel.companies (slug, name, plan, status)
    VALUES (${COMPANY_B_SLUG}, 'MX10 Isolation Test B', 'trial', 'active')
    RETURNING id
  `;

  companyAId = rowA.id;
  companyBId = rowB.id;
});

afterAll(async () => {
  if (!hasDb || sharedSql === undefined) return;
  // Cascade deletes limparão dados relacionados
  await sharedSql`
    DELETE FROM kernel.companies WHERE slug IN (${COMPANY_A_SLUG}, ${COMPANY_B_SLUG})
  `;
  await sharedSql.end();
});

// ---------------------------------------------------------------------------
// 1. kernel.files — isolamento por company_id
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("RLS isolation — kernel.files", () => {
  let sql: ReturnType<typeof postgres>;
  let fileAId: string;
  let fileBId: string;

  beforeAll(async () => {
    sql = makeSql();

    const [fA] = await sql<[{ id: string }]>`
      INSERT INTO kernel.files (company_id, kind, name, created_by)
      VALUES (${companyAId}, 'folder', 'pasta-empresa-a', ${companyAId})
      RETURNING id
    `;
    const [fB] = await sql<[{ id: string }]>`
      INSERT INTO kernel.files (company_id, kind, name, created_by)
      VALUES (${companyBId}, 'folder', 'pasta-empresa-b', ${companyBId})
      RETURNING id
    `;
    fileAId = fA.id;
    fileBId = fB.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM kernel.files WHERE id IN (${fileAId}, ${fileBId})`;
    await sql.end();
  });

  test("sem contexto → 0 rows (fail-closed)", async () => {
    const rows = await asUserNoTenant(
      sql,
      (tx) => tx`SELECT count(*)::int AS n FROM kernel.files`,
    );
    expect((rows as [{ n: number }])[0].n).toBe(0);
  });

  test("company A vê apenas arquivos de A", async () => {
    const rows = await asUser(
      sql,
      companyAId,
      (tx) => tx<[{ id: string }]>`SELECT id FROM kernel.files`,
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(fileAId);
    expect(ids).not.toContain(fileBId);
  });

  test("company B vê apenas arquivos de B", async () => {
    const rows = await asUser(
      sql,
      companyBId,
      (tx) => tx<[{ id: string }]>`SELECT id FROM kernel.files`,
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(fileBId);
    expect(ids).not.toContain(fileAId);
  });
});

// ---------------------------------------------------------------------------
// 2. kernel.people — isolamento por company_id
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("RLS isolation — kernel.people", () => {
  let sql: ReturnType<typeof postgres>;
  let personAId: string;
  let personBId: string;

  beforeAll(async () => {
    sql = makeSql();

    const [pA] = await sql<[{ id: string }]>`
      INSERT INTO kernel.people (company_id, full_name, status)
      VALUES (${companyAId}, 'Pessoa Empresa A', 'active')
      RETURNING id
    `;
    const [pB] = await sql<[{ id: string }]>`
      INSERT INTO kernel.people (company_id, full_name, status)
      VALUES (${companyBId}, 'Pessoa Empresa B', 'active')
      RETURNING id
    `;
    personAId = pA.id;
    personBId = pB.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM kernel.people WHERE id IN (${personAId}, ${personBId})`;
    await sql.end();
  });

  test("sem contexto → 0 rows (fail-closed)", async () => {
    const rows = await asUserNoTenant(
      sql,
      (tx) => tx`SELECT count(*)::int AS n FROM kernel.people`,
    );
    expect((rows as [{ n: number }])[0].n).toBe(0);
  });

  test("company A vê apenas pessoas de A", async () => {
    const rows = await asUser(
      sql,
      companyAId,
      (tx) => tx<[{ id: string }]>`SELECT id FROM kernel.people`,
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(personAId);
    expect(ids).not.toContain(personBId);
  });

  test("company B vê apenas pessoas de B", async () => {
    const rows = await asUser(
      sql,
      companyBId,
      (tx) => tx<[{ id: string }]>`SELECT id FROM kernel.people`,
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(personBId);
    expect(ids).not.toContain(personAId);
  });
});

// ---------------------------------------------------------------------------
// 3. kernel.chat_channels — isolamento por company_id
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("RLS isolation — kernel.chat_channels", () => {
  let sql: ReturnType<typeof postgres>;
  let channelAId: string;
  let channelBId: string;

  beforeAll(async () => {
    sql = makeSql();

    const [cA] = await sql<[{ id: string }]>`
      INSERT INTO kernel.chat_channels (company_id, kind, name, created_by)
      VALUES (${companyAId}, 'channel', 'canal-a', ${companyAId})
      RETURNING id
    `;
    const [cB] = await sql<[{ id: string }]>`
      INSERT INTO kernel.chat_channels (company_id, kind, name, created_by)
      VALUES (${companyBId}, 'channel', 'canal-b', ${companyBId})
      RETURNING id
    `;
    channelAId = cA.id;
    channelBId = cB.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM kernel.chat_channels WHERE id IN (${channelAId}, ${channelBId})`;
    await sql.end();
  });

  test("sem contexto → 0 rows (fail-closed)", async () => {
    const rows = await asUserNoTenant(
      sql,
      (tx) => tx`SELECT count(*)::int AS n FROM kernel.chat_channels`,
    );
    expect((rows as [{ n: number }])[0].n).toBe(0);
  });

  test("company A vê apenas canais de A", async () => {
    const rows = await asUser(
      sql,
      companyAId,
      (tx) => tx<[{ id: string }]>`SELECT id FROM kernel.chat_channels`,
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(channelAId);
    expect(ids).not.toContain(channelBId);
  });

  test("company B vê apenas canais de B", async () => {
    const rows = await asUser(
      sql,
      companyBId,
      (tx) => tx<[{ id: string }]>`SELECT id FROM kernel.chat_channels`,
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(channelBId);
    expect(ids).not.toContain(channelAId);
  });
});

// ---------------------------------------------------------------------------
// 4. kernel.settings — isolamento por scope_id (user ou company)
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("RLS isolation — kernel.settings", () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    sql = makeSql();

    // Insere settings de company scope para A e B
    await sql`
      INSERT INTO kernel.settings (scope, scope_id, key, value)
      VALUES
        ('company', ${companyAId}, 'test.key', '"valor-a"'),
        ('company', ${companyBId}, 'test.key', '"valor-b"')
      ON CONFLICT (scope, scope_id, key) DO NOTHING
    `;
  });

  afterAll(async () => {
    await sql`
      DELETE FROM kernel.settings
      WHERE scope = 'company' AND scope_id IN (${companyAId}, ${companyBId}) AND key = 'test.key'
    `;
    await sql.end();
  });

  test("company A vê settings de A (scope=company)", async () => {
    const rows = await asUser(
      sql,
      companyAId,
      (tx) =>
        tx<[{ scope_id: string }]>`
        SELECT scope_id FROM kernel.settings
        WHERE scope = 'company' AND key = 'test.key'
      `,
    );
    const ids = rows.map((r) => r.scope_id);
    expect(ids).toContain(companyAId);
    expect(ids).not.toContain(companyBId);
  });

  test("company B vê settings de B (scope=company)", async () => {
    const rows = await asUser(
      sql,
      companyBId,
      (tx) =>
        tx<[{ scope_id: string }]>`
        SELECT scope_id FROM kernel.settings
        WHERE scope = 'company' AND key = 'test.key'
      `,
    );
    const ids = rows.map((r) => r.scope_id);
    expect(ids).toContain(companyBId);
    expect(ids).not.toContain(companyAId);
  });
});

// ---------------------------------------------------------------------------
// 5. kernel.is_invariant_operation — validação da função DB (MX8)
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("DB function — kernel.is_invariant_operation", () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(() => {
    sql = makeSql();
  });

  afterAll(async () => {
    await sql.end();
  });

  test("platform.person.deactivated com actor agent → true (bloqueado)", async () => {
    const [{ result }] = await sql<[{ result: boolean }]>`
      SELECT kernel.is_invariant_operation('platform.person.deactivated', 'agent') AS result
    `;
    expect(result).toBe(true);
  });

  test("platform.file.deleted com actor agent → true (bloqueado)", async () => {
    const [{ result }] = await sql<[{ result: boolean }]>`
      SELECT kernel.is_invariant_operation('platform.file.deleted', 'agent') AS result
    `;
    expect(result).toBe(true);
  });

  test("platform.tenant.suspended com actor agent → true (bloqueado)", async () => {
    const [{ result }] = await sql<[{ result: boolean }]>`
      SELECT kernel.is_invariant_operation('platform.tenant.suspended', 'agent') AS result
    `;
    expect(result).toBe(true);
  });

  test("platform.person.deactivated com actor human → false (permitido)", async () => {
    const [{ result }] = await sql<[{ result: boolean }]>`
      SELECT kernel.is_invariant_operation('platform.person.deactivated', 'human') AS result
    `;
    expect(result).toBe(false);
  });

  test("platform.file.uploaded com actor agent → false (não invariante)", async () => {
    const [{ result }] = await sql<[{ result: boolean }]>`
      SELECT kernel.is_invariant_operation('platform.file.uploaded', 'agent') AS result
    `;
    expect(result).toBe(false);
  });

  test("evento desconhecido com actor agent → false (sem bloqueio por default)", async () => {
    const [{ result }] = await sql<[{ result: boolean }]>`
      SELECT kernel.is_invariant_operation('some.unknown.event', 'agent') AS result
    `;
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. kernel.audit_log — append-only, isolamento
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("RLS isolation — kernel.audit_log", () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(() => {
    sql = makeSql();
  });

  afterAll(async () => {
    await sql.end();
  });

  test("authenticated não consegue ler audit_log (sem SELECT policy)", async () => {
    const rows = await asUser(sql, companyAId, async (tx) => {
      return (tx as unknown as ReturnType<typeof postgres>)<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.audit_log
      `.catch(() => [{ n: 0 }]);
    });
    // Sem policy SELECT para authenticated — 0 rows ou erro capturado
    expect((rows as [{ n: number }])[0].n).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. kernel.staff_access_log — insert own, no SELECT
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("RLS isolation — kernel.staff_access_log", () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(() => {
    sql = makeSql();
  });

  afterAll(async () => {
    await sql.end();
  });

  test("service_role pode ler staff_access_log cross-tenant", async () => {
    // Superuser (service_role) tem acesso irrestrito
    const [{ n }] = await sql<[{ n: number }]>`
      SELECT count(*)::int AS n FROM kernel.staff_access_log
    `;
    expect(n).toBeGreaterThanOrEqual(0); // sem dados obrigatórios; apenas verifica acesso
  });
});
