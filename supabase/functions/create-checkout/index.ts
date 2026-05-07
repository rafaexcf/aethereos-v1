// Edge Function: create-checkout (Super Sprint E / MX236)
//
// MODO SIMULADO (R9). Em vez de criar Stripe Checkout Session real,
// atualiza kernel.subscriptions diretamente para o novo plano e cria
// uma fatura "pending" simbólica. Stripe real entra quando a conta PJ
// estiver verificada — basta substituir esta Edge Function por uma
// que crie Stripe Checkout Session e o stripe-webhook reconcilia.
//
// POST /create-checkout
// Body: { plan_code: 'pro' | 'enterprise' | 'free' }
// Response: { ok: true, plan_code, simulated: true, redirect: string }
//
// R11: apenas owner pode mudar plano. Admin recebe 403.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import {
  isPlanCode,
  PLAN_NAMES,
  PLAN_PRICES_CENTS,
  type PlanCode,
} from "../_shared/billing.ts";

interface CheckoutBody {
  plan_code?: string;
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

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  if (!isPlanCode(body.plan_code)) {
    return json(400, {
      error: "plan_code inválido",
      valid: ["free", "pro", "enterprise"],
    });
  }
  const newPlan: PlanCode = body.plan_code;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: membership } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membership === null) {
    return json(403, { error: "Sem membership ativa" });
  }
  const { company_id: companyId, role } = membership as {
    company_id: string;
    role: string;
  };

  if (role !== "owner") {
    return json(403, { error: "Apenas o owner pode alterar o plano" });
  }

  const { data: subRaw } = await admin
    .schema("kernel")
    .from("subscriptions")
    .select("id, plan_code, current_period_start, current_period_end")
    .eq("company_id", companyId)
    .maybeSingle();

  const previousPlan =
    (subRaw as { plan_code?: PlanCode } | null)?.plan_code ?? "free";
  const subscriptionId = (subRaw as { id?: string } | null)?.id ?? null;

  // Atualiza assinatura para novo plano. Reset do período só em upgrade real
  // (ou em downgrade explícito) — para simulado, mantemos o período corrente.
  const { error: updErr } = await admin
    .schema("kernel")
    .from("subscriptions")
    .update({
      plan_code: newPlan,
      status: "active",
      cancel_at_period_end: false,
    })
    .eq("company_id", companyId);

  if (updErr !== null) {
    return json(500, {
      error: "Falha ao atualizar plano",
      detail: updErr.message,
    });
  }

  // Cria fatura simbólica (status=paid em modo simulado para refletir
  // mudança imediata no portal). amount_cents é o preço base do plano.
  if (subscriptionId !== null && PLAN_PRICES_CENTS[newPlan] > 0) {
    const invoiceNumber = `SIM-${new Date().toISOString().slice(0, 10)}-${companyId.slice(0, 8)}`;
    await admin
      .schema("kernel")
      .from("invoices")
      .insert({
        company_id: companyId,
        subscription_id: subscriptionId,
        amount_cents: PLAN_PRICES_CENTS[newPlan],
        currency: "BRL",
        status: "paid",
        invoice_number: invoiceNumber,
        period_start: (subRaw as { current_period_start?: string } | null)
          ?.current_period_start,
        period_end: (subRaw as { current_period_end?: string } | null)
          ?.current_period_end,
        paid_at: new Date().toISOString(),
      });
  }

  // SCP: emit platform.billing.plan_changed (caso o consumer NotificationConsumer
  // ou audit-consumer queiram materializar). Best-effort.
  await admin
    .schema("kernel")
    .from("scp_outbox")
    .insert({
      event_id: crypto.randomUUID(),
      event_type: "platform.billing.plan_changed",
      company_id: companyId,
      payload: {
        company_id: companyId,
        previous_plan: previousPlan,
        new_plan: newPlan,
        simulated: true,
      },
      envelope: {
        id: crypto.randomUUID(),
        type: "platform.billing.plan_changed",
        version: "1",
        tenant_id: companyId,
        actor: { type: "human", user_id: user.id },
        correlation_id: crypto.randomUUID(),
        payload: {
          previous_plan: previousPlan,
          new_plan: newPlan,
          simulated: true,
        },
        occurred_at: new Date().toISOString(),
        schema_version: "1",
      },
      attempts: 0,
    });

  return json(200, {
    ok: true,
    plan_code: newPlan,
    plan_name: PLAN_NAMES[newPlan],
    previous_plan: previousPlan,
    simulated: true,
    message:
      newPlan === previousPlan
        ? "Você já está neste plano."
        : `Plano atualizado para ${PLAN_NAMES[newPlan]} (modo simulado, sem cobrança real).`,
  });
});
