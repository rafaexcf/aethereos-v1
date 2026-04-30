// Edge Function: register-company
// Cadastro atômico de empresa + profile + employee + tenant_membership.
// Fluxo A: CNPJ novo → cria empresa (status=pending) + owner
// Fluxo B: CNPJ existente → cria solicitação de acesso (status=pending)
//
// Requer: auth user PREVIAMENTE criado via supabase.auth.signUp no cliente.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RegisterBody {
  email?: string;
  fullName?: string;
  phone?: string;
  cnpj?: string;
  position?: string;
  areaTrabalho?: string;
}

function cleanCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

async function lookupCnpj(
  cnpj: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/cnpj-lookup?cnpj=${cnpj}`,
      { headers: { apikey: anonKey } },
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Autenticar usuário via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authorization header requerido" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const jwt = authHeader.slice(7);

  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(jwt);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Token inválido ou expirado" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Parse body
  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validações
  const cnpjRaw = body.cnpj ?? "";
  const cnpj = cleanCnpj(cnpjRaw);
  if (cnpj.length !== 14) {
    return new Response(JSON.stringify({ error: "CNPJ deve ter 14 dígitos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fullName = (body.fullName ?? "").trim();
  if (!fullName || fullName.length < 2) {
    return new Response(
      JSON.stringify({ error: "Nome completo é obrigatório" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const email = (body.email ?? user.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const position = (body.position ?? "").trim();
  const areaTrabalho = (body.areaTrabalho ?? "").trim();

  // Lookup CNPJ
  const cnpjData = await lookupCnpj(cnpj, supabaseUrl, anonKey);
  const companyName = cnpjData
    ? String(cnpjData.razao_social ?? "")
    : `Empresa ${cnpj}`;
  const tradeName = cnpjData
    ? cnpjData.nome_fantasia
      ? String(cnpjData.nome_fantasia)
      : null
    : null;

  // Chamar RPC atômica via service_role
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await adminClient.rpc("register_user_with_cnpj", {
    p_user_id: user.id,
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_cnpj: cnpj,
    p_cnpj_data: cnpjData ?? {},
    p_position: position,
    p_area_trabalho: areaTrabalho,
    p_company_name: companyName,
    p_trade_name: tradeName ?? "",
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
