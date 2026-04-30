/**
 * Smoke test automatizado — Sprint 9.5 / MX31
 *
 * Valida 3 coisas obrigatórias para o sprint fechar:
 *   T1. Login retorna HTTP 200 + access_token válido (3 partes JWT)
 *   T2. JWT contém custom claims: companies[], active_company_id, is_staff
 *   T3. Query REST autenticada não retorna erro HTTP (RLS funcional)
 *
 * Self-contained: cria company + user + membership para o teste,
 * limpa no final. Não depende de dados de seed.
 *
 * Uso:
 *   pnpm test:smoke
 * EXIT 0 = todos os 3 testes passaram.
 * EXIT 1 = algum teste falhou.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Carrega .env.local
// ---------------------------------------------------------------------------
function loadEnv(): void {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const envPath = resolve(dir, "../../../.env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // env pode vir de outro lugar
  }
}

loadEnv();

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["SUPABASE_ANON_KEY"] ?? "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_KEY"] ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌  SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_KEY são obrigatórios.",
  );
  console.error("   Execute: pnpm setup:env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "kernel" },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function ok(msg: string): void {
  console.log(`  ✅  ${msg}`);
  passed++;
}

function fail(msg: string, detail?: unknown): void {
  console.error(`  ❌  ${msg}`);
  if (detail !== undefined) console.error("     ", detail);
  failed++;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("JWT inválido: não tem 3 partes");
  const payload = parts[1];
  if (!payload) throw new Error("JWT inválido: payload vazio");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(
    Buffer.from(padded, "base64url").toString("utf-8"),
  ) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Setup: criar dados de teste
// ---------------------------------------------------------------------------
const TEST_COMPANY_ID = "f0000000-0000-0000-0000-000000000001";
const TEST_USER_EMAIL = `smoke-test-${Date.now()}@aethereos-smoke.local`;
const TEST_USER_PASS = "SmokeTest@2026!";

async function setup(): Promise<string> {
  // Company
  const { error: ce } = await admin
    .from("companies")
    .upsert(
      {
        id: TEST_COMPANY_ID,
        slug: "smoke-test-co",
        name: "Smoke Test Co",
        plan: "starter",
        status: "active",
      },
      { onConflict: "id" },
    );
  if (ce !== null)
    throw new Error(`setup: company upsert falhou: ${ce.message}`);

  // Auth user
  const { data: created, error: ue } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASS,
    email_confirm: true,
  });
  if (ue !== null || created.user === null) {
    throw new Error(
      `setup: user creation falhou: ${ue?.message ?? "sem data"}`,
    );
  }
  const userId = created.user.id;

  // Membership
  const { error: me } = await admin
    .from("tenant_memberships")
    .upsert(
      { user_id: userId, company_id: TEST_COMPANY_ID, role: "owner" },
      { onConflict: "user_id,company_id" },
    );
  if (me !== null)
    throw new Error(`setup: membership upsert falhou: ${me.message}`);

  return userId;
}

// ---------------------------------------------------------------------------
// Cleanup: remover dados de teste
// ---------------------------------------------------------------------------
async function cleanup(userId: string): Promise<void> {
  try {
    await admin.from("tenant_memberships").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from("companies").delete().eq("id", TEST_COMPANY_ID);
  } catch {
    // falhas no cleanup não afetam o resultado
  }
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------
async function testLogin(): Promise<string | null> {
  console.log("\n[T1] Login retorna HTTP 200 + JWT válido");

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await anonClient.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASS,
  });

  if (error !== null || data.session === null) {
    fail("signInWithPassword falhou", error?.message ?? "sem sessão");
    return null;
  }

  const token = data.session.access_token;
  const parts = token.split(".");
  if (parts.length !== 3) {
    fail("access_token não é JWT válido (não tem 3 partes)");
    return null;
  }

  ok(`login bem-sucedido — JWT com ${parts.length} partes`);
  return token;
}

async function testJwtClaims(token: string): Promise<void> {
  console.log(
    "\n[T2] JWT contém custom claims: companies, active_company_id, is_staff",
  );

  let payload: Record<string, unknown>;
  try {
    payload = decodeJwtPayload(token);
  } catch (e) {
    fail("falha ao decodificar JWT payload", e);
    return;
  }

  // companies deve existir (pode ser [] ou array com UUIDs)
  if (!("companies" in payload)) {
    fail("claim 'companies' ausente no JWT — hook não está sendo chamado");
    return;
  }
  ok(`claim 'companies' presente: ${JSON.stringify(payload["companies"])}`);

  // active_company_id deve existir (pode ser null ou UUID)
  if (!("active_company_id" in payload)) {
    fail("claim 'active_company_id' ausente no JWT");
    return;
  }
  const acid = payload["active_company_id"];
  if (acid === null || acid === "null") {
    fail(
      "active_company_id é null — membership não foi criada ou hook tem bug",
    );
    return;
  }
  ok(`claim 'active_company_id' = ${String(acid)}`);

  // is_staff deve existir
  if (!("is_staff" in payload)) {
    fail("claim 'is_staff' ausente no JWT");
    return;
  }
  ok(`claim 'is_staff' = ${String(payload["is_staff"])}`);
}

async function testRlsQuery(token: string): Promise<void> {
  console.log("\n[T3] Query REST autenticada não retorna erro HTTP");

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    db: { schema: "kernel" },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // kernel.users tem grant SELECT para authenticated (kernel_schema.sql).
  // kernel.files não tem grant (bug #10 anotado, fora do escopo deste sprint).
  const { error } = await authedClient
    .from("users")
    .select("id, email")
    .limit(5);
  if (error !== null) {
    fail(`query em kernel.users retornou erro: ${error.message}`, error.code);
    return;
  }

  ok(
    "query em kernel.users retornou sem erro (RLS + authenticated access funcional)",
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("=== Aethereos Smoke Test — Sprint 9.5/MX31 ===");
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Usuário de teste: ${TEST_USER_EMAIL}`);

  let userId: string | null = null;

  try {
    console.log("\n[SETUP] Criando dados de teste...");
    userId = await setup();
    console.log(`  → user_id: ${userId}`);
    console.log(`  → company_id: ${TEST_COMPANY_ID}`);

    const token = await testLogin();
    if (token !== null) {
      await testJwtClaims(token);
      await testRlsQuery(token);
    } else {
      // T2 e T3 não puderam rodar
      failed += 2;
    }
  } catch (e) {
    console.error("\n❌  Erro fatal no setup:", e);
    failed++;
  } finally {
    if (userId !== null) {
      console.log("\n[CLEANUP] Removendo dados de teste...");
      await cleanup(userId);
    }
  }

  console.log(`\n=== Resultado: ${passed} ok, ${failed} falha(s) ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Fatal:", err);
  process.exit(1);
});
