import type { SupabaseBrowserDataDriver } from "@aethereos/drivers-supabase/browser";
import type { ScpPublisherBrowser } from "./scp-publisher-browser";

export interface ProposalToExecute {
  id: string;
  intentType: string;
  payload: Record<string, unknown>;
}

export interface ProposalExecutorDeps {
  data: SupabaseBrowserDataDriver;
  scp: ScpPublisherBrowser;
}

export interface ExecuteResult {
  ok: boolean;
  error?: string;
  resourceId?: string;
}

interface InsertResult {
  data: { id: string }[] | null;
  error: { message: string } | null;
}

/**
 * Sprint 17 MX84 — executa uma proposal aprovada do Copilot.
 * Switch sobre intent_type. Cada handler:
 *  1. Extrai campos do payload
 *  2. INSERT/UPDATE na tabela alvo (kernel.*) com credenciais do humano
 *  3. Retorna { ok, resourceId } ou { ok: false, error }
 *
 * Apos sucesso, o caller (Copilot ou Governanca) atualiza o status do
 * proposal para "executed" e emite agent.copilot.action_executed.
 *
 * Freio agentico (R10): execucao usa o DataDriver autenticado do humano.
 * RLS garante que so as tables/rows da company ativa sao acessadas.
 */
export async function executeProposal(
  deps: ProposalExecutorDeps,
  proposal: ProposalToExecute,
  userId: string,
  companyId: string,
): Promise<ExecuteResult> {
  switch (proposal.intentType) {
    case "create_person":
      return executeCreatePerson(deps, proposal, userId, companyId);
    case "create_file":
      return executeCreateFile(deps, proposal, userId, companyId);
    case "send_notification":
      return executeSendNotification(deps, proposal, userId, companyId);
    case "update_settings":
      return executeUpdateSettings(deps, proposal, userId, companyId);
    case "create_channel":
      return executeCreateChannel(deps, proposal, userId, companyId);
    default:
      return {
        ok: false,
        error: `intent_type desconhecido: ${proposal.intentType}`,
      };
  }
}

async function executeCreatePerson(
  { data, scp }: ProposalExecutorDeps,
  proposal: ProposalToExecute,
  userId: string,
  companyId: string,
): Promise<ExecuteResult> {
  const fullName = String(proposal.payload["full_name"] ?? "").trim();
  if (fullName.length === 0) {
    return { ok: false, error: "full_name vazio no payload" };
  }
  const emailRaw = String(proposal.payload["email"] ?? "").trim();

  const res = (await data
    .from("people")
    .insert({
      company_id: companyId,
      full_name: fullName,
      ...(emailRaw.length > 0 ? { email: emailRaw } : {}),
      status: "active",
    })
    .select("id")) as unknown as InsertResult;

  if (res.error !== null) return { ok: false, error: res.error.message };
  const personId = res.data?.[0]?.id;
  if (personId === undefined) {
    return { ok: false, error: "INSERT retornou row sem id" };
  }

  void scp.publishEvent(
    "platform.person.created",
    {
      person_id: personId,
      company_id: companyId,
      full_name: fullName,
      email: emailRaw.length > 0 ? emailRaw : null,
      created_by: userId,
    },
    { actor: { type: "human", user_id: userId } },
  );

  return { ok: true, resourceId: personId };
}

async function executeCreateFile(
  { data, scp }: ProposalExecutorDeps,
  proposal: ProposalToExecute,
  userId: string,
  companyId: string,
): Promise<ExecuteResult> {
  const name = String(proposal.payload["name"] ?? "").trim();
  if (name.length === 0) return { ok: false, error: "name vazio no payload" };
  const kindRaw = String(proposal.payload["kind"] ?? "folder");
  const kind = kindRaw === "file" ? "file" : "folder";

  const res = (await data
    .from("files")
    .insert({
      company_id: companyId,
      parent_id: null,
      kind,
      name,
      created_by: userId,
    })
    .select("id")) as unknown as InsertResult;

  if (res.error !== null) return { ok: false, error: res.error.message };
  const fileId = res.data?.[0]?.id;
  if (fileId === undefined) {
    return { ok: false, error: "INSERT retornou row sem id" };
  }

  if (kind === "folder") {
    void scp.publishEvent(
      "platform.folder.created",
      {
        folder_id: fileId,
        company_id: companyId,
        parent_id: null,
        name,
        created_by: userId,
      },
      { actor: { type: "human", user_id: userId } },
    );
  }
  // kind === "file" sem upload fisico: nao emite SCP (platform.file.uploaded
  // exige storage_path nao-vazio — esse path eh uma metadata-only stub.
  // Quando upload real for implementado em sprint futuro, emitir aqui.)

  return { ok: true, resourceId: fileId };
}

async function executeSendNotification(
  { data }: ProposalExecutorDeps,
  proposal: ProposalToExecute,
  userId: string,
  companyId: string,
): Promise<ExecuteResult> {
  const title = String(proposal.payload["title"] ?? "").trim();
  if (title.length === 0) {
    return { ok: false, error: "title vazio no payload" };
  }
  const body = String(proposal.payload["body"] ?? "");
  const typeRaw = String(proposal.payload["type"] ?? "info");
  const type =
    typeRaw === "warning" || typeRaw === "error" || typeRaw === "success"
      ? typeRaw
      : "info";

  const res = (await data
    .from("notifications")
    .insert({
      company_id: companyId,
      user_id: userId,
      type,
      title,
      body,
      source_app: "copilot",
    })
    .select("id")) as unknown as InsertResult;

  if (res.error !== null) return { ok: false, error: res.error.message };
  const notifId = res.data?.[0]?.id;
  return notifId !== undefined
    ? { ok: true, resourceId: notifId }
    : { ok: true };
}

async function executeUpdateSettings(
  { data, scp }: ProposalExecutorDeps,
  proposal: ProposalToExecute,
  userId: string,
  companyId: string,
): Promise<ExecuteResult> {
  const scopeRaw = String(proposal.payload["scope"] ?? "user");
  const scope = scopeRaw === "company" ? "company" : "user";
  const key = String(proposal.payload["key"] ?? "").trim();
  if (key.length === 0) return { ok: false, error: "key vazio no payload" };
  const scopeId = scope === "company" ? companyId : userId;

  const res = (await data.from("settings").upsert(
    {
      scope,
      scope_id: scopeId,
      key,
      value: proposal.payload,
    },
    { onConflict: "scope,scope_id,key" },
  )) as unknown as { error: { message: string } | null };

  if (res.error !== null) return { ok: false, error: res.error.message };

  void scp.publishEvent(
    "platform.settings.updated",
    {
      company_id: companyId,
      scope,
      scope_id: scopeId,
      key,
      updated_by: userId,
    },
    { actor: { type: "human", user_id: userId } },
  );

  return { ok: true };
}

async function executeCreateChannel(
  { data, scp }: ProposalExecutorDeps,
  proposal: ProposalToExecute,
  userId: string,
  companyId: string,
): Promise<ExecuteResult> {
  const name = String(proposal.payload["name"] ?? "").trim();
  if (name.length === 0) return { ok: false, error: "name vazio no payload" };
  const kindRaw = String(proposal.payload["kind"] ?? "channel");
  const kind = kindRaw === "dm" ? "dm" : "channel";

  const res = (await data
    .from("chat_channels")
    .insert({
      company_id: companyId,
      name,
      kind,
      created_by: userId,
    })
    .select("id")) as unknown as InsertResult;

  if (res.error !== null) return { ok: false, error: res.error.message };
  const channelId = res.data?.[0]?.id;
  if (channelId === undefined) {
    return { ok: false, error: "INSERT retornou row sem id" };
  }

  void scp.publishEvent(
    "platform.chat.channel_created",
    {
      channel_id: channelId,
      company_id: companyId,
      name,
      kind,
      created_by: userId,
    },
    { actor: { type: "human", user_id: userId } },
  );

  return { ok: true, resourceId: channelId };
}
