import { describe, it, expect } from "vitest";
import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { EnrichmentConsumer } from "../../src/consumers/enrichment-consumer.js";
import { mockSql } from "./_mock-sql.js";

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const USER = "00000000-0000-0000-0000-0000000000bb";

function env(
  type: string,
  payload: Record<string, unknown>,
  id = "ev-enr",
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

describe("EnrichmentConsumer", () => {
  const consumer = new EnrichmentConsumer();

  it("matches() apenas os 4 event types declarados", () => {
    expect(consumer.matches("platform.person.created")).toBe(true);
    expect(consumer.matches("platform.file.uploaded")).toBe(true);
    expect(consumer.matches("platform.chat.channel_created")).toBe(true);
    expect(consumer.matches("agent.copilot.action_executed")).toBe(true);
    expect(consumer.matches("platform.folder.created")).toBe(false);
    expect(consumer.matches("commerce.order.placed")).toBe(false);
  });

  it("person.created: UPSERT person summary + count people => company_stats", async () => {
    const personId = "00000000-0000-0000-0000-000000000111";
    const { sql, calls } = mockSql([
      [], // INSERT person summary
      [{ total: 7 }], // SELECT COUNT
      [], // INSERT company_stats
    ]);
    await consumer.handle(
      env("platform.person.created", {
        person_id: personId,
        full_name: "Maria",
        email: "m@x.com",
        created_by: USER,
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(3);
    // person summary insert
    const personValues = calls[0]?.values ?? [];
    expect(personValues[0]).toBe(COMPANY);
    expect(personValues[1]).toBe("person");
    expect(personValues[2]).toBe(personId);
    expect(personValues[3]).toBe("summary");
    // company_stats
    const statsValues = calls[2]?.values ?? [];
    expect(statsValues[1]).toBe("company");
    expect(statsValues[2]).toBe(COMPANY);
    expect(statsValues[3]).toBe("company_stats");
    // data jsonb contem total_people
    const statsData = JSON.parse(statsValues[4] as string);
    expect(statsData.total_people).toBe(7);
  });

  it("person.created: skip se person_id ausente", async () => {
    const { sql, calls } = mockSql([]);
    await consumer.handle(
      env("platform.person.created", { full_name: "Sem ID" }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(0);
  });

  it("file.uploaded: UPSERT file summary + count files => company_stats_files", async () => {
    const fileId = "00000000-0000-0000-0000-000000000fff";
    const { sql, calls } = mockSql([
      [], // INSERT file summary
      [{ total: 42 }], // SELECT COUNT
      [], // INSERT company_stats_files
    ]);
    await consumer.handle(
      env("platform.file.uploaded", {
        file_id: fileId,
        name: "doc.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        uploaded_by: USER,
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(3);
    const fileValues = calls[0]?.values ?? [];
    expect(fileValues[1]).toBe("file");
    expect(fileValues[2]).toBe(fileId);
    expect(fileValues[3]).toBe("summary");
    const statsValues = calls[2]?.values ?? [];
    expect(statsValues[3]).toBe("company_stats_files");
    expect(JSON.parse(statsValues[4] as string).total_files).toBe(42);
  });

  it("chat.channel_created: UPSERT channel summary (sem stats)", async () => {
    const channelId = "00000000-0000-0000-0000-0000000ccccc";
    const { sql, calls } = mockSql([[]]);
    await consumer.handle(
      env("platform.chat.channel_created", {
        channel_id: channelId,
        name: "#geral",
        kind: "public",
        created_by: USER,
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(1);
    const v = calls[0]?.values ?? [];
    expect(v[1]).toBe("channel");
    expect(v[2]).toBe(channelId);
    expect(v[3]).toBe("summary");
  });

  it("agent.action_executed: incrementa total_actions a partir do existente", async () => {
    const { sql, calls } = mockSql([
      [{ data: { total_actions: 4 } }], // SELECT existing
      [], // UPSERT incrementing
    ]);
    await consumer.handle(
      env("agent.copilot.action_executed", {
        proposal_id: "p1",
        intent_type: "create_person",
        executed_by: USER,
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(2);
    const v = calls[1]?.values ?? [];
    expect(v[1]).toBe("agent");
    expect(v[2]).toBe(USER);
    expect(v[3]).toBe("activity_count");
    const data = JSON.parse(v[4] as string);
    expect(data.total_actions).toBe(5);
    expect(data.last_intent_type).toBe("create_person");
  });

  it("agent.action_executed: cold start (sem record previo) total_actions=1", async () => {
    const { sql, calls } = mockSql([
      [], // SELECT empty
      [],
    ]);
    await consumer.handle(
      env("agent.copilot.action_executed", {
        intent_type: "create_file",
        executed_by: USER,
      }),
      sql as unknown as Sql,
    );
    const v = calls[1]?.values ?? [];
    expect(JSON.parse(v[4] as string).total_actions).toBe(1);
  });

  it("R12: erro em qualquer query é engolido (nao re-throw)", async () => {
    const sql = ((): unknown => {
      throw new Error("db down");
    }) as unknown as Sql;
    await expect(
      consumer.handle(
        env("platform.person.created", {
          person_id: "00000000-0000-0000-0000-000000000111",
        }),
        sql,
      ),
    ).resolves.toBeUndefined();
  });
});
