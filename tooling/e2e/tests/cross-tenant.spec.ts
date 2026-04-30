/**
 * Cross-tenant isolation E2E
 *
 * Validates that RLS policies prevent data from leaking across companies.
 * Uses the Supabase REST API directly (via fetch) to verify that a JWT
 * from company A cannot read company B's kernel.companies data.
 *
 * Requirements:
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD  — user belonging to company A
 *   E2E_USER_B_EMAIL / E2E_USER_B_PASSWORD — user belonging to company B (different company)
 *   E2E_SUPABASE_URL — Supabase project URL
 *   E2E_SUPABASE_ANON_KEY — Supabase anon key
 */
import { test, expect } from "@playwright/test";

const EMAIL_A = process.env["E2E_USER_EMAIL"] ?? "";
const PASS_A = process.env["E2E_USER_PASSWORD"] ?? "";
const EMAIL_B = process.env["E2E_USER_B_EMAIL"] ?? "";
const PASS_B = process.env["E2E_USER_B_PASSWORD"] ?? "";
const SUPABASE_URL = process.env["E2E_SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["E2E_SUPABASE_ANON_KEY"] ?? "";

const hasTwoUsers =
  EMAIL_A && PASS_A && EMAIL_B && PASS_B && SUPABASE_URL && SUPABASE_ANON_KEY;

async function getAccessToken(
  email: string,
  password: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token?: string };
    return body.access_token ?? null;
  } catch {
    return null;
  }
}

async function queryCompanies(accessToken: string): Promise<unknown[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/kernel_companies?select=id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Accept-Profile": "kernel",
      },
    },
  );
  if (!res.ok) return [];
  return (await res.json()) as unknown[];
}

test.describe("cross-tenant RLS isolation", () => {
  test("user A and user B see different company sets", async () => {
    if (!hasTwoUsers) {
      test.skip(
        true,
        "E2E_USER_B_* or E2E_SUPABASE_* env vars not set — skipping cross-tenant test",
      );
      return;
    }

    const tokenA = await getAccessToken(EMAIL_A, PASS_A);
    const tokenB = await getAccessToken(EMAIL_B, PASS_B);

    expect(tokenA).not.toBeNull();
    expect(tokenB).not.toBeNull();

    const companiesA = await queryCompanies(tokenA!);
    const companiesB = await queryCompanies(tokenB!);

    const idsA = new Set(
      (companiesA as Array<{ id: string }>).map((c) => c.id),
    );
    const idsB = new Set(
      (companiesB as Array<{ id: string }>).map((c) => c.id),
    );

    // Intersection must be empty — each user sees only their own companies
    const overlap = [...idsA].filter((id) => idsB.has(id));
    expect(overlap).toHaveLength(0);
  });

  test("unauthenticated request to kernel.companies returns empty or 401", async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip(true, "E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY not set");
      return;
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/kernel_companies?select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Accept-Profile": "kernel",
        },
      },
    );

    // RLS must block unauthenticated reads — either 401 or empty array
    if (res.ok) {
      const rows = (await res.json()) as unknown[];
      expect(rows).toHaveLength(0);
    } else {
      expect([401, 403]).toContain(res.status);
    }
  });
});
