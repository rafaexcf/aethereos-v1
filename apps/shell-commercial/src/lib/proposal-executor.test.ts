import { describe, it, expect, vi } from "vitest";
import { executeProposal } from "./proposal-executor";

interface MockBuilder {
  insert: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
}

const COMPANY_ID = "00000000-0000-0000-0000-000000000c01";
const USER_ID = "00000000-0000-0000-0000-000000000001";

function mkInsertSelectMock(
  insertedId = "00000000-0000-0000-0000-000000000abc",
) {
  const select = vi.fn().mockResolvedValue({
    data: [{ id: insertedId }],
    error: null,
  });
  const insert = vi.fn().mockReturnValue({ select });
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  return { insert, upsert, select };
}

function mkDeps(builder: MockBuilder) {
  const dataDriver = {
    from: vi.fn().mockReturnValue(builder),
  };
  const scp = { publishEvent: vi.fn().mockResolvedValue({}) };
  return {
    deps: {
      data: dataDriver as never,
      scp: scp as never,
    },
    dataDriver,
    scp,
  };
}

describe("executeProposal", () => {
  it("create_person: INSERT em people com full_name + email + status active", async () => {
    const builder = mkInsertSelectMock();
    const { deps, dataDriver, scp } = mkDeps(builder);

    const res = await executeProposal(
      deps,
      {
        id: "p1",
        intentType: "create_person",
        payload: { full_name: "Joao Silva", email: "joao@test.com" },
      },
      USER_ID,
      COMPANY_ID,
    );

    expect(res.ok).toBe(true);
    expect(dataDriver.from).toHaveBeenCalledWith("people");
    expect(builder.insert).toHaveBeenCalledWith({
      company_id: COMPANY_ID,
      full_name: "Joao Silva",
      email: "joao@test.com",
      status: "active",
    });
    expect(scp.publishEvent).toHaveBeenCalledWith(
      "platform.person.created",
      expect.objectContaining({
        company_id: COMPANY_ID,
        full_name: "Joao Silva",
        created_by: USER_ID,
      }),
      expect.objectContaining({
        actor: { type: "human", user_id: USER_ID },
      }),
    );
  });

  it("create_person: rejeita full_name vazio", async () => {
    const builder = mkInsertSelectMock();
    const { deps } = mkDeps(builder);
    const res = await executeProposal(
      deps,
      { id: "p1", intentType: "create_person", payload: { full_name: "" } },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("full_name");
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("create_file (folder): INSERT em files + SCP folder.created", async () => {
    const builder = mkInsertSelectMock();
    const { deps, dataDriver, scp } = mkDeps(builder);

    const res = await executeProposal(
      deps,
      {
        id: "p2",
        intentType: "create_file",
        payload: { name: "Vendas Q4", kind: "folder" },
      },
      USER_ID,
      COMPANY_ID,
    );

    expect(res.ok).toBe(true);
    expect(dataDriver.from).toHaveBeenCalledWith("files");
    expect(builder.insert).toHaveBeenCalledWith({
      company_id: COMPANY_ID,
      parent_id: null,
      kind: "folder",
      name: "Vendas Q4",
      created_by: USER_ID,
    });
    expect(scp.publishEvent).toHaveBeenCalledWith(
      "platform.folder.created",
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("create_file (file): nao emite SCP (storage_path stub vazio)", async () => {
    const builder = mkInsertSelectMock();
    const { deps, scp } = mkDeps(builder);
    const res = await executeProposal(
      deps,
      {
        id: "p2",
        intentType: "create_file",
        payload: { name: "doc.txt", kind: "file" },
      },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(true);
    expect(scp.publishEvent).not.toHaveBeenCalled();
  });

  it("send_notification: INSERT em notifications com source_app=copilot", async () => {
    const builder = mkInsertSelectMock();
    const { deps, dataDriver, scp } = mkDeps(builder);
    const res = await executeProposal(
      deps,
      {
        id: "p3",
        intentType: "send_notification",
        payload: { title: "Heads up", body: "look at me", type: "warning" },
      },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(true);
    expect(dataDriver.from).toHaveBeenCalledWith("notifications");
    expect(builder.insert).toHaveBeenCalledWith({
      company_id: COMPANY_ID,
      user_id: USER_ID,
      type: "warning",
      title: "Heads up",
      body: "look at me",
      source_app: "copilot",
    });
    // notify nao precisa de SCP — a notificacao em si e o resultado
    expect(scp.publishEvent).not.toHaveBeenCalled();
  });

  it("update_settings (company): UPSERT em settings + SCP settings.updated", async () => {
    const builder = mkInsertSelectMock();
    const { deps, dataDriver, scp } = mkDeps(builder);
    const res = await executeProposal(
      deps,
      {
        id: "p4",
        intentType: "update_settings",
        payload: { scope: "company", key: "theme.primary_color" },
      },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(true);
    expect(dataDriver.from).toHaveBeenCalledWith("settings");
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "company",
        scope_id: COMPANY_ID,
        key: "theme.primary_color",
      }),
      { onConflict: "scope,scope_id,key" },
    );
    expect(scp.publishEvent).toHaveBeenCalledWith(
      "platform.settings.updated",
      expect.objectContaining({
        scope: "company",
        scope_id: COMPANY_ID,
        key: "theme.primary_color",
        updated_by: USER_ID,
      }),
      expect.any(Object),
    );
  });

  it("update_settings (user): scope_id = userId", async () => {
    const builder = mkInsertSelectMock();
    const { deps, builder: _b } = { ...mkDeps(builder), builder };
    const res = await executeProposal(
      deps,
      {
        id: "p4",
        intentType: "update_settings",
        payload: { scope: "user", key: "appearance.density" },
      },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(true);
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "user", scope_id: USER_ID }),
      expect.any(Object),
    );
  });

  it("create_channel: INSERT em chat_channels + SCP chat.channel_created", async () => {
    const builder = mkInsertSelectMock();
    const { deps, dataDriver, scp } = mkDeps(builder);
    const res = await executeProposal(
      deps,
      {
        id: "p5",
        intentType: "create_channel",
        payload: { name: "vendas-2026", kind: "channel" },
      },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(true);
    expect(dataDriver.from).toHaveBeenCalledWith("chat_channels");
    expect(builder.insert).toHaveBeenCalledWith({
      company_id: COMPANY_ID,
      name: "vendas-2026",
      kind: "channel",
      created_by: USER_ID,
    });
    expect(scp.publishEvent).toHaveBeenCalledWith(
      "platform.chat.channel_created",
      expect.objectContaining({
        company_id: COMPANY_ID,
        name: "vendas-2026",
        kind: "channel",
        created_by: USER_ID,
      }),
      expect.any(Object),
    );
  });

  it("intent_type desconhecido retorna erro descritivo", async () => {
    const builder = mkInsertSelectMock();
    const { deps } = mkDeps(builder);
    const res = await executeProposal(
      deps,
      { id: "p9", intentType: "delete_database", payload: {} },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("desconhecido");
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("propaga erro do INSERT (RLS denied, etc)", async () => {
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "RLS policy violation" },
    });
    const insert = vi.fn().mockReturnValue({ select });
    const builder = { insert, upsert: vi.fn(), select };
    const { deps } = mkDeps(builder);
    const res = await executeProposal(
      deps,
      {
        id: "p1",
        intentType: "create_person",
        payload: { full_name: "Test" },
      },
      USER_ID,
      COMPANY_ID,
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("RLS");
  });
});
