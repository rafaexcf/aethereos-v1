/**
 * Testes de isolação cross-tenant (RLS).
 *
 * Requer Supabase local rodando: pnpm dev:db
 * Define TEST_DATABASE_URL com a URL do postgres local (porta 54322):
 *   postgresql://postgres:postgres@localhost:54322/postgres
 *
 * Skip automático se TEST_DATABASE_URL não estiver definida.
 */

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const dbUrl = process.env["TEST_DATABASE_URL"];
const hasDb = !!dbUrl;

const SLUG_A = "test-rls-company-a";
const SLUG_B = "test-rls-company-b";

describe.skipIf(!hasDb)("RLS isolation — kernel.companies", () => {
  let sql: ReturnType<typeof postgres>;
  let companyAId: string;
  let companyBId: string;

  beforeAll(async () => {
    sql = postgres(dbUrl ?? "");

    // Remove dados de runs anteriores caso existam
    await sql`
      DELETE FROM kernel.companies WHERE slug IN (${SLUG_A}, ${SLUG_B})
    `;

    // Insere 2 companies como superuser (bypassa RLS) para os testes
    const [rowA] = await sql<[{ id: string }]>`
      INSERT INTO kernel.companies (slug, name, plan, status)
      VALUES (${SLUG_A}, 'RLS Test Company A', 'trial', 'active')
      RETURNING id
    `;
    const [rowB] = await sql<[{ id: string }]>`
      INSERT INTO kernel.companies (slug, name, plan, status)
      VALUES (${SLUG_B}, 'RLS Test Company B', 'trial', 'active')
      RETURNING id
    `;

    companyAId = rowA.id;
    companyBId = rowB.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM kernel.companies WHERE slug IN (${SLUG_A}, ${SLUG_B})`;
    await sql.end();
  });

  test("sem contexto de tenant → 0 rows (fail-closed)", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      return tx<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.companies
      `;
    });
    expect(rows[0].n).toBe(0);
  });

  test("com contexto da company A → vê apenas company A", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('app.current_company_id', ${companyAId}, true)`;
      return tx<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.companies
      `;
    });
    expect(rows[0].n).toBe(1);
  });

  test("com contexto da company B → vê apenas company B", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('app.current_company_id', ${companyBId}, true)`;
      return tx<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.companies
      `;
    });
    expect(rows[0].n).toBe(1);
  });

  test("mudar contexto na mesma sessão muda visibilidade", async () => {
    const [nA, nB, nNone] = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;

      await tx`SELECT set_config('app.current_company_id', ${companyAId}, true)`;
      const [{ n: nA }] = await tx<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.companies
      `;

      // Muda para company B na mesma transação
      await tx`SELECT set_config('app.current_company_id', ${companyBId}, true)`;
      const [{ n: nB }] = await tx<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.companies
      `;

      // Limpa contexto
      await tx`SELECT set_config('app.current_company_id', '', true)`;
      const [{ n: nNone }] = await tx<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.companies
      `;

      return [nA, nB, nNone] as const;
    });

    expect(nA).toBe(1); // vê company A
    expect(nB).toBe(1); // vê company B
    expect(nNone).toBe(0); // contexto limpo → fail-closed
  });

  test("company A não vê dados de company B e vice-versa", async () => {
    const rowsSeenByA = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('app.current_company_id', ${companyAId}, true)`;
      return tx<Array<{ slug: string }>>`
        SELECT slug FROM kernel.companies ORDER BY slug
      `;
    });

    const rowsSeenByB = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('app.current_company_id', ${companyBId}, true)`;
      return tx<Array<{ slug: string }>>`
        SELECT slug FROM kernel.companies ORDER BY slug
      `;
    });

    expect(rowsSeenByA.map((r) => r.slug)).toEqual([SLUG_A]);
    expect(rowsSeenByB.map((r) => r.slug)).toEqual([SLUG_B]);
  });
});

describe.skipIf(!hasDb)("RLS isolation — kernel.scp_outbox", () => {
  let sql: ReturnType<typeof postgres>;
  let companyAId: string;
  let companyBId: string;
  const OUTBOX_SLUG_A = "test-outbox-company-a";
  const OUTBOX_SLUG_B = "test-outbox-company-b";

  beforeAll(async () => {
    sql = postgres(dbUrl ?? "");

    await sql`
      DELETE FROM kernel.companies WHERE slug IN (${OUTBOX_SLUG_A}, ${OUTBOX_SLUG_B})
    `;

    const [rowA] = await sql<[{ id: string }]>`
      INSERT INTO kernel.companies (slug, name, plan, status)
      VALUES (${OUTBOX_SLUG_A}, 'Outbox Test A', 'trial', 'active')
      RETURNING id
    `;
    const [rowB] = await sql<[{ id: string }]>`
      INSERT INTO kernel.companies (slug, name, plan, status)
      VALUES (${OUTBOX_SLUG_B}, 'Outbox Test B', 'trial', 'active')
      RETURNING id
    `;

    companyAId = rowA.id;
    companyBId = rowB.id;

    // Insere eventos na outbox como superuser
    await sql`
      INSERT INTO kernel.scp_outbox (company_id, event_type, payload, envelope)
      VALUES
        (${companyAId}, 'test.event.created', '{"source":"A"}'::jsonb, '{}'::jsonb),
        (${companyBId}, 'test.event.created', '{"source":"B"}'::jsonb, '{}'::jsonb)
    `;
  });

  afterAll(async () => {
    await sql`
      DELETE FROM kernel.scp_outbox
      WHERE company_id IN (${companyAId}, ${companyBId})
    `;
    await sql`
      DELETE FROM kernel.companies WHERE slug IN (${OUTBOX_SLUG_A}, ${OUTBOX_SLUG_B})
    `;
    await sql.end();
  });

  test("authenticated sem contexto não lê outbox (sem política SELECT para autenticados)", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      // A política SELECT da outbox só existe para service_role (worker);
      // authenticated não tem SELECT na outbox → 0 rows (permissão negada, não RLS)
      return tx<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.scp_outbox
      `.catch(() => [{ n: 0 }]);
    });
    expect(rows[0].n).toBe(0);
  });

  test("service_role (superuser) lê todos os eventos cross-tenant", async () => {
    const [{ n }] = await sql<[{ n: number }]>`
      SELECT count(*)::int AS n FROM kernel.scp_outbox
      WHERE company_id IN (${companyAId}, ${companyBId})
    `;
    expect(n).toBe(2);
  });
});
