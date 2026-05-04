import { describe, it, expect } from "vitest";
import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { NotificationConsumer } from "../../src/consumers/notification-consumer.js";
import { mockSql } from "./_mock-sql.js";

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const USER = "00000000-0000-0000-0000-0000000000bb";

function env(
  type: string,
  payload: Record<string, unknown>,
  id = "ev-1",
): EventEnvelope {
  return {
    id,
    type,
    tenant_id: COMPANY,
    actor: { type: "human", user_id: USER },
    payload,
    occurred_at: new Date().toISOString(),
  } as EventEnvelope;
}

describe("NotificationConsumer", () => {
  const consumer = new NotificationConsumer();

  it("matches() limita-se aos 4 event_types declarados", () => {
    expect(consumer.matches("platform.person.created")).toBe(true);
    expect(consumer.matches("platform.file.uploaded")).toBe(true);
    expect(consumer.matches("platform.folder.created")).toBe(true);
    expect(consumer.matches("platform.chat.channel_created")).toBe(true);
    expect(consumer.matches("platform.module.installed")).toBe(false);
    expect(consumer.matches("commerce.order.placed")).toBe(false);
  });

  it("person.created: SELECT idempotente + INSERT title='Novo contato' body=full_name", async () => {
    const { sql, calls } = mockSql([
      [], // SELECT existing => 0 rows
      [], // INSERT
    ]);
    await consumer.handle(
      env("platform.person.created", {
        full_name: "Maria",
        created_by: USER,
        company_id: COMPANY,
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(2);
    const insertValues = calls[1]?.values ?? [];
    // (user_id, company_id, type, title, body, source_app, source_id)
    expect(insertValues[0]).toBe(USER);
    expect(insertValues[1]).toBe(COMPANY);
    expect(insertValues[2]).toBe("info");
    expect(insertValues[3]).toBe("Novo contato");
    expect(insertValues[4]).toBe("Maria");
    expect(insertValues[5]).toBe("platform");
    expect(insertValues[6]).toBe("ev-1");
  });

  it("idempotencia: SELECT retorna 1 row => skip (sem INSERT)", async () => {
    const { sql, calls } = mockSql([
      [{ id: "existing-uuid" }], // SELECT existing => ja notificou
    ]);
    await consumer.handle(
      env("platform.person.created", {
        full_name: "Maria",
        created_by: USER,
        company_id: COMPANY,
      }),
      sql as unknown as Sql,
    );
    // Apenas o SELECT, sem INSERT
    expect(calls).toHaveLength(1);
  });

  it("file.uploaded: title='Arquivo enviado' body=name", async () => {
    const { sql, calls } = mockSql([[], []]);
    await consumer.handle(
      env("platform.file.uploaded", {
        name: "report.pdf",
        uploaded_by: USER,
        company_id: COMPANY,
      }),
      sql as unknown as Sql,
    );
    const insertValues = calls[1]?.values ?? [];
    expect(insertValues[3]).toBe("Arquivo enviado");
    expect(insertValues[4]).toBe("report.pdf");
  });

  it("folder.created: title='Pasta criada' body=name", async () => {
    const { sql, calls } = mockSql([[], []]);
    await consumer.handle(
      env("platform.folder.created", {
        name: "Compliance",
        created_by: USER,
        company_id: COMPANY,
      }),
      sql as unknown as Sql,
    );
    const insertValues = calls[1]?.values ?? [];
    expect(insertValues[3]).toBe("Pasta criada");
    expect(insertValues[4]).toBe("Compliance");
  });

  it("chat.channel_created: title='Canal criado' body=name", async () => {
    const { sql, calls } = mockSql([[], []]);
    await consumer.handle(
      env("platform.chat.channel_created", {
        name: "#geral",
        created_by: USER,
        company_id: COMPANY,
      }),
      sql as unknown as Sql,
    );
    const insertValues = calls[1]?.values ?? [];
    expect(insertValues[3]).toBe("Canal criado");
    expect(insertValues[4]).toBe("#geral");
  });

  it("payload incompleto (sem created_by/full_name) => skip silencioso", async () => {
    const { sql, calls } = mockSql([]);
    await consumer.handle(
      env("platform.person.created", { full_name: "Maria" }), // sem created_by
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(0);
  });

  it("fallback: company_id ausente no payload => usa envelope.tenant_id", async () => {
    const { sql, calls } = mockSql([[], []]);
    await consumer.handle(
      env("platform.person.created", {
        full_name: "Maria",
        created_by: USER,
        // company_id ausente
      }),
      sql as unknown as Sql,
    );
    const insertValues = calls[1]?.values ?? [];
    expect(insertValues[1]).toBe(COMPANY); // tenant_id
  });
});
