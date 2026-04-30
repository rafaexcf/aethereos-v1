import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ApproveBody {
  company_id: string;
  action: "approve" | "reject";
  reason?: string;
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Missing Authorization" }, { status: 401 });
  }

  const claims = decodeJwt(token);
  if (claims === null || claims["is_platform_admin"] !== true) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const staffUserId = typeof claims["sub"] === "string" ? claims["sub"] : null;
  if (staffUserId === null) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  // Body
  let body: ApproveBody;
  try {
    body = (await req.json()) as ApproveBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_id, action, reason } = body;
  if (!company_id || !["approve", "reject"].includes(action)) {
    return Response.json(
      { error: "company_id and action ('approve'|'reject') are required" },
      { status: 400 },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Verify company exists and is pending
  const { data: company, error: fetchErr } = await admin
    .schema("kernel")
    .from("companies")
    .select("id, name, status")
    .eq("id", company_id)
    .single();

  if (fetchErr || !company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  if ((company as { status: string }).status !== "pending") {
    return Response.json(
      {
        error: `Company is not pending (current: ${(company as { status: string }).status})`,
      },
      { status: 409 },
    );
  }

  const newStatus = action === "approve" ? "active" : "cancelled";
  const eventType =
    action === "approve"
      ? "platform.company.approved"
      : "platform.company.rejected";

  // Update company status
  const { error: updateErr } = await admin
    .schema("kernel")
    .from("companies")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", company_id);

  if (updateErr) {
    return Response.json(
      { error: `Failed to update company: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // If approving, also activate owner membership
  if (action === "approve") {
    await admin
      .schema("kernel")
      .from("tenant_memberships")
      .update({ status: "active" })
      .eq("company_id", company_id)
      .eq("role", "owner");
  }

  // Emit SCP event
  const payload = {
    company_id,
    company_name: (company as { name: string }).name,
    staff_user_id: staffUserId,
    action,
    ...(reason ? { reason } : {}),
  };

  await admin.schema("kernel").from("scp_outbox").insert({
    company_id,
    event_type: eventType,
    actor_id: staffUserId,
    actor_type: "human",
    payload,
    published: false,
  });

  return Response.json(
    { ok: true, company_id, action, new_status: newStatus },
    {
      headers: { "Access-Control-Allow-Origin": "*" },
    },
  );
});
