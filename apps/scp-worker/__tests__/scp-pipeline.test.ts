/**
 * MX11 — Validação do pipeline SCP (outbox → worker → publicação).
 *
 * Valida mecanicamente cada etapa do pipeline de eventos SCP sem necessitar
 * de NATS ou Edge Function em execução. Testa o contrato do outbox:
 * - Inserção com envelope correto (simula Edge Function / service_role)
 * - Leitura e processamento pelo worker (simula scp-worker)
 * - Transição de status pending → published / failed
 * - Bloqueio de operações invariantes pelo trigger DB
 * - Idempotência por event_id único
 *
 * Requer Supabase local rodando: pnpm dev:db
 * TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
 *
 * Skip automático se TEST_DATABASE_URL não estiver definida.
 * Ref: ADR-0020, Fundamentação 8.10 [INV], CLAUDE.md seção 5
 */

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const dbUrl = process.env["TEST_DATABASE_URL"];
const hasDb = !!dbUrl;

const PIPELINE_SLUG_A = "mx11-pipeline-test-a";
const PIPELINE_SLUG_B = "mx11-pipeline-test-b";

let sharedSql: ReturnType<typeof postgres>;
let companyAId: string;
let companyBId: string;

function makeSql() {
  return postgres(dbUrl ?? "");
}

function buildEnvelope(
  eventType: string,
  companyId: string,
  payload: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: crypto.randomUUID(),
    type: eventType,
    actor: {
      type: "human",
      user_id: crypto.randomUUID(),
    },
    correlation_id: crypto.randomUUID(),
    payload: { ...payload, company_id: companyId },
    occurred_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeAll(async () => {
  if (!hasDb) return;
  sharedSql = makeSql();

  await sharedSql`
    DELETE FROM kernel.companies WHERE slug IN (${PIPELINE_SLUG_A}, ${PIPELINE_SLUG_B})
  `;

  const [rowA] = await sharedSql<[{ id: string }]>`
    INSERT INTO kernel.companies (slug, name, plan, status)
    VALUES (${PIPELINE_SLUG_A}, 'MX11 Pipeline Test A', 'trial', 'active')
    RETURNING id
  `;
  const [rowB] = await sharedSql<[{ id: string }]>`
    INSERT INTO kernel.companies (slug, name, plan, status)
    VALUES (${PIPELINE_SLUG_B}, 'MX11 Pipeline Test B', 'trial', 'active')
    RETURNING id
  `;

  companyAId = rowA.id;
  companyBId = rowB.id;
});

afterAll(async () => {
  if (!hasDb || sharedSql === undefined) return;
  await sharedSql`
    DELETE FROM kernel.companies WHERE slug IN (${PIPELINE_SLUG_A}, ${PIPELINE_SLUG_B})
  `;
  await sharedSql.end();
});

// ---------------------------------------------------------------------------
// 1. Escrita do outbox (simula Edge Function / service_role)
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("SCP pipeline — escrita no outbox", () => {
  let sql: ReturnType<typeof postgres>;
  let insertedId: number;
  let insertedEventId: string;

  beforeAll(async () => {
    sql = makeSql();
  });

  afterAll(async () => {
    if (insertedId !== undefined) {
      await sql`DELETE FROM kernel.scp_outbox WHERE id = ${insertedId}`;
    }
    await sql.end();
  });

  test("service_role insere evento no outbox com status pending", async () => {
    const envelope = buildEnvelope("platform.file.uploaded", companyAId, {
      file_id: crypto.randomUUID(),
      name: "relatorio.pdf",
    });

    const [row] = await sql<
      [{ id: number; status: string; event_id: string; event_type: string }]
    >`
      INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
      VALUES (
        ${companyAId},
        'platform.file.uploaded',
        ${envelope["id"] as string},
        ${sql.json(envelope["payload"] as Record<string, unknown>)},
        ${sql.json(envelope)}
      )
      RETURNING id, status, event_id, event_type
    `;

    insertedId = row.id;
    insertedEventId = row.event_id;

    expect(row.status).toBe("pending");
    expect(row.event_type).toBe("platform.file.uploaded");
    expect(row.event_id).toBe(envelope["id"]);
  });

  test("envelope armazenado preserva todos os campos obrigatórios", async () => {
    const [row] = await sql<
      [{ envelope: Record<string, unknown>; company_id: string }]
    >`
      SELECT envelope, company_id FROM kernel.scp_outbox WHERE id = ${insertedId}
    `;

    expect(row.company_id).toBe(companyAId);
    expect(typeof row.envelope["id"]).toBe("string");
    expect(typeof row.envelope["type"]).toBe("string");
    expect(typeof row.envelope["actor"]).toBe("object");
    expect(typeof row.envelope["occurred_at"]).toBe("string");
    expect(typeof row.envelope["payload"]).toBe("object");
  });

  test("event_id é único — inserção duplicada é rejeitada", async () => {
    let threw = false;
    try {
      await sql`
        INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
        VALUES (
          ${companyAId},
          'platform.file.uploaded',
          ${insertedEventId},
          '{}',
          '{}'::jsonb
        )
      `;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Processamento pelo worker (pending → published)
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)(
  "SCP pipeline — transições de status pelo worker",
  () => {
    let sql: ReturnType<typeof postgres>;
    let rowId: number;

    beforeAll(async () => {
      sql = makeSql();

      const envelope = buildEnvelope("platform.folder.created", companyBId, {
        folder_id: crypto.randomUUID(),
        name: "documentos",
      });

      const [row] = await sql<[{ id: number }]>`
      INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
      VALUES (
        ${companyBId},
        'platform.folder.created',
        ${envelope["id"] as string},
        ${sql.json(envelope["payload"] as Record<string, unknown>)},
        ${sql.json(envelope)}
      )
      RETURNING id
    `;
      rowId = row.id;
    });

    afterAll(async () => {
      await sql`DELETE FROM kernel.scp_outbox WHERE id = ${rowId}`;
      await sql.end();
    });

    test("worker lê eventos pending com FOR UPDATE SKIP LOCKED", async () => {
      const rows = await sql<
        Array<{ id: number; status: string; event_type: string }>
      >`
      SELECT id, status, event_type
      FROM kernel.scp_outbox
      WHERE status = 'pending'
        AND id = ${rowId}
      FOR UPDATE SKIP LOCKED
    `;
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("pending");
    });

    test("worker marca evento como published após publicação no NATS", async () => {
      await sql`
      UPDATE kernel.scp_outbox
      SET status = 'published',
          published_at = now(),
          attempts = attempts + 1
      WHERE id = ${rowId}
    `;

      const [row] = await sql<
        [{ status: string; published_at: string | null; attempts: number }]
      >`
      SELECT status, published_at, attempts FROM kernel.scp_outbox WHERE id = ${rowId}
    `;

      expect(row.status).toBe("published");
      expect(row.published_at).not.toBeNull();
      expect(row.attempts).toBe(1);
    });

    test("evento published não aparece em próximo poll de pending", async () => {
      const rows = await sql<Array<{ id: number }>>`
      SELECT id FROM kernel.scp_outbox
      WHERE status = 'pending' AND id = ${rowId}
    `;
      expect(rows).toHaveLength(0);
    });
  },
);

// ---------------------------------------------------------------------------
// 3. Tentativas exauridas → status failed
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("SCP pipeline — falha após max tentativas", () => {
  let sql: ReturnType<typeof postgres>;
  let rowId: number;
  const MAX_ATTEMPTS = 5;

  beforeAll(async () => {
    sql = makeSql();

    const envelope = buildEnvelope("platform.chat.message_sent", companyAId, {
      message_id: crypto.randomUUID(),
      channel_id: crypto.randomUUID(),
    });

    const [row] = await sql<[{ id: number }]>`
      INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
      VALUES (
        ${companyAId},
        'platform.chat.message_sent',
        ${envelope["id"] as string},
        ${sql.json(envelope["payload"] as Record<string, unknown>)},
        ${sql.json(envelope)}
      )
      RETURNING id
    `;
    rowId = row.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM kernel.scp_outbox WHERE id = ${rowId}`;
    await sql.end();
  });

  test("após MAX_ATTEMPTS falhas, status torna-se failed", async () => {
    // Simula worker incrementando tentativas até o limite
    await sql`
      UPDATE kernel.scp_outbox
      SET attempts = ${MAX_ATTEMPTS - 1},
          last_error = 'NATS connection timeout'
      WHERE id = ${rowId}
    `;

    // Última tentativa que dispara a transição para failed
    await sql`
      UPDATE kernel.scp_outbox
      SET attempts = attempts + 1,
          last_error = 'NATS connection timeout',
          status = CASE WHEN attempts + 1 >= ${MAX_ATTEMPTS} THEN 'failed' ELSE 'pending' END
      WHERE id = ${rowId}
    `;

    const [row] = await sql<
      [{ status: string; attempts: number; last_error: string | null }]
    >`
      SELECT status, attempts, last_error FROM kernel.scp_outbox WHERE id = ${rowId}
    `;

    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(MAX_ATTEMPTS);
    expect(row.last_error).toBe("NATS connection timeout");
  });
});

// ---------------------------------------------------------------------------
// 4. Bloqueio de operações invariantes pelo trigger DB
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)(
  "SCP pipeline — trigger bloqueia operações invariantes de agente",
  () => {
    let sql: ReturnType<typeof postgres>;

    beforeAll(() => {
      sql = makeSql();
    });

    afterAll(async () => {
      await sql.end();
    });

    test("platform.person.deactivated com actor agent → INSERT rejeitado pelo trigger", async () => {
      const envelope = buildEnvelope(
        "platform.person.deactivated",
        companyAId,
        { person_id: crypto.randomUUID() },
        {
          actor: {
            type: "agent",
            agent_id: crypto.randomUUID(),
            supervising_user_id: crypto.randomUUID(),
          },
        },
      );

      let threw = false;
      try {
        await sql`
          INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
          VALUES (
            ${companyAId},
            'platform.person.deactivated',
            ${envelope["id"] as string},
            ${sql.json(envelope["payload"] as Record<string, unknown>)},
            ${sql.json(envelope)}
          )
        `;
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });

    test("platform.file.deleted com actor agent → INSERT rejeitado pelo trigger", async () => {
      const envelope = buildEnvelope(
        "platform.file.deleted",
        companyAId,
        { file_id: crypto.randomUUID() },
        {
          actor: {
            type: "agent",
            agent_id: crypto.randomUUID(),
            supervising_user_id: crypto.randomUUID(),
          },
        },
      );

      let threw = false;
      try {
        await sql`
          INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
          VALUES (
            ${companyAId},
            'platform.file.deleted',
            ${envelope["id"] as string},
            ${sql.json(envelope["payload"] as Record<string, unknown>)},
            ${sql.json(envelope)}
          )
        `;
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });

    test("platform.person.deactivated com actor human → INSERT permitido", async () => {
      const envelope = buildEnvelope(
        "platform.person.deactivated",
        companyAId,
        { person_id: crypto.randomUUID(), approval_token: crypto.randomUUID() },
      );

      let rowId: number | undefined;
      try {
        const [row] = await sql<[{ id: number }]>`
          INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
          VALUES (
            ${companyAId},
            'platform.person.deactivated',
            ${envelope["id"] as string},
            ${sql.json(envelope["payload"] as Record<string, unknown>)},
            ${sql.json(envelope)}
          )
          RETURNING id
        `;
        rowId = row.id;
      } finally {
        if (rowId !== undefined) {
          await sql`DELETE FROM kernel.scp_outbox WHERE id = ${rowId}`;
        }
      }
      expect(rowId).toBeDefined();
    });
  },
);

// ---------------------------------------------------------------------------
// 5. Isolamento cross-tenant no outbox
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)(
  "SCP pipeline — isolamento cross-tenant no outbox",
  () => {
    let sql: ReturnType<typeof postgres>;
    const insertedIds: number[] = [];

    beforeAll(async () => {
      sql = makeSql();

      for (const companyId of [companyAId, companyBId]) {
        const envelope = buildEnvelope("platform.file.uploaded", companyId, {
          file_id: crypto.randomUUID(),
          name: "arquivo.txt",
        });

        const [row] = await sql<[{ id: number }]>`
        INSERT INTO kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
        VALUES (
          ${companyId},
          'platform.file.uploaded',
          ${envelope["id"] as string},
          ${sql.json(envelope["payload"] as Record<string, unknown>)},
          ${sql.json(envelope)}
        )
        RETURNING id
      `;
        insertedIds.push(row.id);
      }
    });

    afterAll(async () => {
      if (insertedIds.length > 0) {
        await sql`DELETE FROM kernel.scp_outbox WHERE id = ANY(${sql.array(insertedIds)}::bigint[])`;
      }
      await sql.end();
    });

    test("service_role (worker) lê outbox cross-tenant — ambas companies visíveis", async () => {
      const rows = await sql<Array<{ company_id: string }>>`
      SELECT company_id FROM kernel.scp_outbox
      WHERE id = ANY(${sql.array(insertedIds)}::bigint[])
    `;
      const seenCompanies = new Set(rows.map((r) => r.company_id));
      expect(seenCompanies.has(companyAId)).toBe(true);
      expect(seenCompanies.has(companyBId)).toBe(true);
    });

    test("authenticated sem contexto não consegue ler outbox (sem SELECT policy)", async () => {
      const rows = await sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        return (tx as unknown as ReturnType<typeof postgres>)<[{ n: number }]>`
        SELECT count(*)::int AS n FROM kernel.scp_outbox
        WHERE id = ANY(${sql.array(insertedIds)}::bigint[])
      `.catch(() => [{ n: 0 }]);
      });
      expect((rows as [{ n: number }])[0].n).toBe(0);
    });
  },
);
