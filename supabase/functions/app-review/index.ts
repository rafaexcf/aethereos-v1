// Edge Function: app-review (Super Sprint F / MX248)
//
// Staff aprova / rejeita / solicita mudanças em uma app submission.
// R8: requer is_staff=true no JWT.
// R9: aprovação dispara auto-publish em kernel.app_registry com app_type='third_party'.
//
// POST /app-review
// Body: {
//   submission_id: string,
//   action: 'approve' | 'reject' | 'request_changes',
//   notes?: string,
//   checklist?: Record<string, boolean>
// }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";

interface ReviewBody {
  submission_id?: string;
  action?: "approve" | "reject" | "request_changes";
  notes?: string;
  checklist?: Record<string, boolean>;
}

interface AppSubmissionRow {
  id: string;
  developer_id: string;
  app_slug: string;
  version: string;
  name: string;
  description: string;
  long_description: string;
  icon: string;
  color: string;
  category: string;
  entry_mode: "iframe" | "weblink";
  entry_url: string;
  external_url: string | null;
  manifest_json: Record<string, unknown>;
  tags: string[];
  pricing_model: string;
  license: string;
  status: string;
}

interface DeveloperRow {
  display_name: string;
  user_id: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req);
  if (pf !== null) return pf;

  const cors = corsHeaders(req.headers.get("origin"));
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Missing Authorization" });
  }
  const jwt = authHeader.slice(7);

  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(jwt);
  if (authError !== null || user === null) {
    return json(401, { error: "Unauthorized" });
  }

  // R8: requer is_staff. Vem de app_metadata.is_staff (set via service_role).
  const isStaff =
    (user.app_metadata as { is_staff?: boolean } | undefined)?.is_staff ===
    true;
  if (!isStaff) {
    return json(403, { error: "Apenas staff pode revisar apps" });
  }

  let body: ReviewBody;
  try {
    body = (await req.json()) as ReviewBody;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  if (
    body.submission_id === undefined ||
    body.action === undefined ||
    !["approve", "reject", "request_changes"].includes(body.action)
  ) {
    return json(400, { error: "submission_id e action obrigatórios" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subRaw } = await admin
    .schema("kernel")
    .from("app_submissions")
    .select("*")
    .eq("id", body.submission_id)
    .maybeSingle();

  if (subRaw === null) return json(404, { error: "Submission não encontrada" });
  const sub = subRaw as AppSubmissionRow;

  if (!["submitted", "in_review"].includes(sub.status)) {
    return json(409, {
      error: `Submission no estado ${sub.status} não pode ser revisada`,
    });
  }

  // INSERT review (audit append-only)
  await admin
    .schema("kernel")
    .from("app_reviews")
    .insert({
      submission_id: sub.id,
      reviewer_id: user.id,
      action: body.action,
      notes: body.notes ?? "",
      checklist: body.checklist ?? {},
    });

  const now = new Date().toISOString();

  if (body.action === "approve") {
    // Auto-publish em app_registry (R9 + R18 app_type='third_party')
    const { data: devRow } = await admin
      .schema("kernel")
      .from("developer_accounts")
      .select("display_name, user_id")
      .eq("id", sub.developer_id)
      .maybeSingle();
    const devName =
      (devRow as DeveloperRow | null)?.display_name ?? "Third party";

    const registryRow = {
      id: sub.app_slug,
      slug: sub.app_slug,
      name: sub.name,
      description: sub.description,
      long_description: sub.long_description,
      icon: sub.icon,
      color: sub.color,
      category: sub.category,
      app_type: "third_party",
      entry_mode: sub.entry_mode === "iframe" ? "iframe" : "external",
      entry_url: sub.entry_url,
      external_url: sub.external_url,
      version: sub.version,
      status: "published",
      pricing_model: sub.pricing_model,
      permissions: (sub.manifest_json as { scopes?: string[] }).scopes ?? [],
      tags: sub.tags,
      license: sub.license,
      developer_name: devName,
      show_in_dock: false,
      closeable: true,
      has_internal_nav: false,
      installable: true,
    };

    await admin
      .schema("kernel")
      .from("app_registry")
      .upsert(registryRow, { onConflict: "id" });

    await admin
      .schema("kernel")
      .from("app_submissions")
      .update({
        status: "published",
        reviewed_at: now,
        published_at: now,
        rejection_reason: null,
      })
      .eq("id", sub.id);

    // Notificar developer
    if (devRow !== null) {
      await notifyDeveloper(admin, (devRow as DeveloperRow).user_id, {
        type: "success",
        title: `App ${sub.name} aprovado e publicado`,
        body: `Sua submissão v${sub.version} foi aprovada e está disponível na Magic Store.`,
        sourceId: `submission:${sub.id}`,
      });
    }

    return json(200, { ok: true, action: "approve", published: true });
  }

  if (body.action === "reject") {
    await admin
      .schema("kernel")
      .from("app_submissions")
      .update({
        status: "rejected",
        reviewed_at: now,
        rejection_reason: body.notes ?? "Sem motivo informado",
      })
      .eq("id", sub.id);

    const { data: devRow } = await admin
      .schema("kernel")
      .from("developer_accounts")
      .select("user_id")
      .eq("id", sub.developer_id)
      .maybeSingle();
    if (devRow !== null) {
      await notifyDeveloper(admin, (devRow as DeveloperRow).user_id, {
        type: "error",
        title: `App ${sub.name} rejeitado`,
        body:
          body.notes ??
          "Sua submissão foi rejeitada. Veja o motivo no Developer Console.",
        sourceId: `submission:${sub.id}`,
      });
    }
    return json(200, { ok: true, action: "reject" });
  }

  // request_changes: volta para draft
  await admin
    .schema("kernel")
    .from("app_submissions")
    .update({
      status: "draft",
      reviewed_at: now,
      rejection_reason: body.notes ?? null,
    })
    .eq("id", sub.id);

  const { data: devRow } = await admin
    .schema("kernel")
    .from("developer_accounts")
    .select("user_id")
    .eq("id", sub.developer_id)
    .maybeSingle();
  if (devRow !== null) {
    await notifyDeveloper(admin, (devRow as DeveloperRow).user_id, {
      type: "warning",
      title: `App ${sub.name} precisa de alterações`,
      body:
        body.notes ??
        "Veja os comentários do staff no Developer Console e resubmeta.",
      sourceId: `submission:${sub.id}`,
    });
  }
  return json(200, { ok: true, action: "request_changes" });
});

// Helper: notifica developer usando uma company ativa qualquer dele.
// Sem company → notif silenciosamente skipada (kernel.notifications
// requer company_id NOT NULL hoje).
type NotifPayload = {
  type: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  sourceId: string;
};

async function notifyDeveloper(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: NotifPayload,
): Promise<void> {
  const { data: anyMembership } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const companyId = (anyMembership as { company_id?: string } | null)
    ?.company_id;
  if (companyId === undefined) return;
  await admin.schema("kernel").from("notifications").insert({
    user_id: userId,
    company_id: companyId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    source_app: "developer-console",
    source_id: payload.sourceId,
  });
}
