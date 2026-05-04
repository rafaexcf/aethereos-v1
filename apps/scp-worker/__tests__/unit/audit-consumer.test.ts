import { describe, it, expect } from "vitest";
import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { AuditConsumer } from "../../src/consumers/audit-consumer.js";
import { mockSql } from "./_mock-sql.js";

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const USER = "00000000-0000-0000-0000-0000000000bb";
const AGENT = "00000000-0000-0000-0000-0000000000cc";

function envelope(
  type: string,
  payload: Record<string, unknown>,
  actor:
    | { type: "human"; user_id: string }
    | { type: "agent"; agent_id: string; supervising_user_id: string }
    | { type: "system"; service_name: string; version: string } = {
    type: "human",
    user_id: USER,
  },
): EventEnvelope {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    type,
    tenant_id: COMPANY,
    actor,
    payload,
    occurred_at: new Date().toISOString(),
  } as EventEnvelope;
}

describe("AuditConsumer", () => {
  const consumer = new AuditConsumer();

  it("matches() é wildcard — captura qualquer event_type", () => {
    expect(consumer.matches("platform.person.created")).toBe(true);
    expect(consumer.matches("commerce.order.placed")).toBe(true);
    expect(consumer.matches("anything.at.all")).toBe(true);
  });

  it("INSERT em kernel.audit_log com actor_type=human + actor_id do user_id", async () => {
    const { sql, calls } = mockSql([[]]);
    await consumer.handle(
      envelope(
        "platform.person.created",
        { person_id: "ppp", full_name: "Maria" },
        { type: "human", user_id: USER },
      ),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.kind).toBe("tag");
    const values = calls[0]?.values ?? [];
    // Ordem dos templates: company_id, actor_id, actor_type, action, resource_type, resource_id, payload(jsonb)
    expect(values[0]).toBe(COMPANY);
    expect(values[1]).toBe(USER);
    expect(values[2]).toBe("human");
    expect(values[3]).toBe("platform.person.created");
    expect(values[4]).toBe("person");
    expect(values[5]).toBe("ppp");
  });

  it("actor agente => actor_type=agent + actor_id=agent_id", async () => {
    const { sql, calls } = mockSql([[]]);
    await consumer.handle(
      envelope(
        "context.note.added",
        {},
        { type: "agent", agent_id: AGENT, supervising_user_id: USER },
      ),
      sql as unknown as Sql,
    );
    const values = calls[0]?.values ?? [];
    expect(values[1]).toBe(AGENT);
    expect(values[2]).toBe("agent");
  });

  it("actor system => actor_id zerado + actor_type=system", async () => {
    const { sql, calls } = mockSql([[]]);
    await consumer.handle(
      envelope(
        "platform.system.tick",
        {},
        { type: "system", service_name: "scp-publish", version: "1.0" },
      ),
      sql as unknown as Sql,
    );
    const values = calls[0]?.values ?? [];
    expect(values[1]).toBe("00000000-0000-0000-0000-000000000000");
    expect(values[2]).toBe("system");
  });

  it("extractResource: file_id => resource_type=file", async () => {
    const { sql, calls } = mockSql([[]]);
    await consumer.handle(
      envelope("platform.file.uploaded", { file_id: "fff", name: "doc.pdf" }),
      sql as unknown as Sql,
    );
    const values = calls[0]?.values ?? [];
    expect(values[4]).toBe("file");
    expect(values[5]).toBe("fff");
  });

  it("extractResource: 'module' => resource_id=null (slug, nao UUID)", async () => {
    const { sql, calls } = mockSql([[]]);
    await consumer.handle(
      envelope("platform.module.installed", { module: "drive" }),
      sql as unknown as Sql,
    );
    const values = calls[0]?.values ?? [];
    expect(values[4]).toBe("module");
    expect(values[5]).toBeNull();
  });

  it("extractResource: payload sem id reconhecivel => prefixo do event_type", async () => {
    const { sql, calls } = mockSql([[]]);
    await consumer.handle(
      envelope("financial.invoice.unknown", { foo: "bar" }),
      sql as unknown as Sql,
    );
    const values = calls[0]?.values ?? [];
    expect(values[4]).toBe("financial");
    expect(values[5]).toBeNull();
  });

  it("R12: erro no INSERT é engolido (audit nao bloqueia pipeline)", async () => {
    // mock-sql que sempre lanca
    const sql = ((): unknown => {
      throw new Error("db down");
    }) as unknown as Sql;
    await expect(
      consumer.handle(envelope("platform.person.created", {}), sql),
    ).resolves.toBeUndefined();
  });
});
