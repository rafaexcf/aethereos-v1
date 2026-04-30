import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CompleteOnboardingBody {
  company_id: string;
  phone?: string;
  logo_url?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
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

  let body: CompleteOnboardingBody;
  try {
    body = (await req.json()) as CompleteOnboardingBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_id, phone, logo_url, address } = body;
  if (!company_id) {
    return Response.json({ error: "company_id is required" }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Validate user belongs to this company as owner or admin
  const { data: membership, error: memberErr } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("role, status")
    .eq("company_id", company_id)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .eq("status", "active")
    .single();

  if (memberErr || !membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build company update
  const companyUpdate: Record<string, unknown> = {
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };
  if (phone !== undefined && phone !== "") companyUpdate["phone"] = phone;
  if (logo_url !== undefined && logo_url !== "")
    companyUpdate["logo_url"] = logo_url;

  const { error: updateErr } = await admin
    .schema("kernel")
    .from("companies")
    .update(companyUpdate)
    .eq("id", company_id);

  if (updateErr) {
    return Response.json(
      { error: `Failed to update company: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // Insert address if provided
  if (address && address.cep) {
    await admin
      .schema("kernel")
      .from("company_addresses")
      .upsert(
        {
          company_id,
          type: "sede",
          zip_code: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement ?? null,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          country: "BR",
          is_primary: true,
          created_by: userId,
        },
        { onConflict: "company_id,type" },
      );
  }

  // Emit SCP event
  await admin
    .schema("kernel")
    .from("scp_outbox")
    .insert({
      company_id,
      event_type: "platform.company.onboarding_completed",
      actor_id: userId,
      actor_type: "human",
      payload: { company_id, user_id: userId },
      published: false,
    });

  return Response.json(
    { ok: true, company_id },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
});
