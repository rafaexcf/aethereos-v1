import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ActivateModuleBody {
  company_id: string;
  module_key: string;
  action: "activate" | "deactivate";
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

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Missing Authorization" }, { status: 401 });
  }

  const claims = decodeJwt(token);
  if (claims === null) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const userId = typeof claims["sub"] === "string" ? claims["sub"] : null;
  if (userId === null) {
    return Response.json(
      { error: "Invalid token: missing sub" },
      { status: 401 },
    );
  }

  let body: ActivateModuleBody;
  try {
    body = (await req.json()) as ActivateModuleBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_id, module_key, action } = body;
  if (
    !company_id ||
    !module_key ||
    !["activate", "deactivate"].includes(action)
  ) {
    return Response.json(
      {
        error:
          "company_id, module_key, and action ('activate'|'deactivate') are required",
      },
      { status: 400 },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Validate user is owner or admin of the company
  const { data: membership, error: memberErr } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("role")
    .eq("company_id", company_id)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .eq("status", "active")
    .single();

  if (memberErr || !membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "activate") {
    const { error: upsertErr } = await admin
      .schema("kernel")
      .from("company_modules")
      .upsert(
        {
          company_id,
          module_key,
          enabled: true,
          enabled_by: userId,
          enabled_at: new Date().toISOString(),
        },
        { onConflict: "company_id,module_key" },
      );

    if (upsertErr) {
      return Response.json(
        { error: `Failed to activate module: ${upsertErr.message}` },
        { status: 500 },
      );
    }
  } else {
    const { error: updateErr } = await admin
      .schema("kernel")
      .from("company_modules")
      .update({ enabled: false })
      .eq("company_id", company_id)
      .eq("module_key", module_key);

    if (updateErr) {
      return Response.json(
        { error: `Failed to deactivate module: ${updateErr.message}` },
        { status: 500 },
      );
    }
  }

  // Emit SCP event
  const eventType =
    action === "activate"
      ? "platform.module.activated"
      : "platform.module.deactivated";

  await admin.schema("kernel").from("scp_outbox").insert({
    company_id,
    event_type: eventType,
    actor_id: userId,
    actor_type: "human",
    payload: { company_id, module_key, action },
    published: false,
  });

  return Response.json(
    { ok: true, company_id, module_key, action },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
});
