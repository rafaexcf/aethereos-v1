// Edge Function: staff-list-companies
// REQUIRES service_role — nunca expor ao browser diretamente.
// Lista todas as companies para staff Aethereos.
// Verifica is_staff=true no JWT antes de qualquer query.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length !== 3) return {};
  try {
    const b64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req);
  if (pf !== null) return pf;

  const origin = req.headers.get("origin");

  if (req.method !== "GET") {
    return jsonResponse({ error: "method not allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing authorization header" }, 401, origin);
  }
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Verificar JWT e identidade do caller
  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(jwt);

  if (authError !== null || user === null) {
    return jsonResponse({ error: "unauthorized" }, 401, origin);
  }

  // Verificar is_staff no JWT — claim injetado pelo custom_access_token_hook
  const payload = decodeJwtPayload(jwt);
  if (payload["is_staff"] !== true) {
    return jsonResponse(
      { error: "forbidden: requires staff role" },
      403,
      origin,
    );
  }

  const staffUserId = user.id;

  // Paginação
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)),
  );
  const offset = (page - 1) * limit;

  // REQUIRES service_role — bypassa RLS para listar todas as companies
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: companies,
    error: companiesError,
    count,
  } = await adminClient
    .schema("kernel")
    .from("companies")
    .select(
      `
      id,
      slug,
      name,
      plan,
      status,
      created_at,
      updated_at,
      member_count:tenant_memberships(count)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (companiesError !== null) {
    console.error("[staff-list-companies] query error", {
      staff_user_id: staffUserId,
      error: companiesError.message,
    });
    return jsonResponse({ error: "falha ao buscar companies" }, 500, origin);
  }

  // Audit: registra acesso no staff_access_log (company_id=null = acesso global à lista)
  const { error: auditError } = await adminClient
    .schema("kernel")
    .from("staff_access_log")
    .insert({ staff_user_id: staffUserId, action: "companies.listed" });

  if (auditError !== null) {
    // Audit failure não deve bloquear a resposta, mas deve ser logado
    console.error("[staff-list-companies] audit log failed", {
      staff_user_id: staffUserId,
      error: auditError.message,
    });
  }

  const total = count ?? 0;

  return jsonResponse(
    {
      data: companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
    200,
    origin,
  );
});
