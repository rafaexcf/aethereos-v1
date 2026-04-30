/**
 * SCP Pipeline E2E — browser → Edge Function → kernel.scp_outbox
 *
 * Validates that the full SCP event pipeline works end-to-end:
 *   1. Authenticated user obtains a JWT with active_company_id claim
 *   2. POST to the scp-publish Edge Function (same call path as the browser)
 *   3. Event appears in kernel.scp_outbox (verified via REST API with service_role)
 *
 * Does not test NATS JetStream (scp-worker is server-side and not part of browser E2E scope).
 * NATS integration is covered by tooling/smoke tests.
 *
 * Requirements:
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD — seed user with at least one company
 *   E2E_SUPABASE_URL — Supabase project URL (local: http://127.0.0.1:54321)
 *   E2E_SUPABASE_ANON_KEY — Supabase anon key
 *   E2E_SUPABASE_SERVICE_KEY — Supabase service_role key (to read outbox)
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";
const SUPABASE_URL = process.env["E2E_SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["E2E_SUPABASE_ANON_KEY"] ?? "";
const SUPABASE_SERVICE_KEY = process.env["E2E_SUPABASE_SERVICE_KEY"] ?? "";

const hasRequiredEnv =
  EMAIL &&
  PASSWORD &&
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_SERVICE_KEY;

async function getJwt(): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token?: string };
    return body.access_token ?? null;
  } catch {
    return null;
  }
}

async function getOutboxCount(
  serviceKey: string,
  eventId: string,
): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/scp_outbox?event_id=eq.${eventId}&select=id`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Accept-Profile": "kernel",
      },
    },
  );
  if (!res.ok) return 0;
  const rows = (await res.json()) as unknown[];
  return rows.length;
}

test.describe("SCP pipeline — browser to outbox", () => {
  test("scp-publish Edge Function inserts event into kernel.scp_outbox", async () => {
    if (!hasRequiredEnv) {
      test.skip(
        true,
        "E2E_SUPABASE_SERVICE_KEY or other required env vars not set — skipping SCP pipeline test",
      );
      return;
    }

    // 1. Get JWT with active_company_id claim
    const jwt = await getJwt();
    expect(
      jwt,
      "Failed to obtain JWT — check E2E_USER_EMAIL/PASSWORD",
    ).not.toBeNull();

    // 2. Decode JWT to extract active_company_id (must be present for scp-publish)
    const parts = (jwt ?? "").split(".");
    const payloadB64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadB64)) as Record<string, unknown>;
    const activeCompanyId = payload["active_company_id"];

    expect(
      activeCompanyId,
      "JWT must contain active_company_id claim — check custom_access_token hook and seed data",
    ).toBeTruthy();

    // 3. POST to scp-publish Edge Function
    const correlationId = crypto.randomUUID();
    const edgeFnUrl = `${SUPABASE_URL}/functions/v1/scp-publish`;

    const publishRes = await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        event_type: "platform.file.uploaded",
        payload: {
          file_name: "e2e-scp-pipeline-test.txt",
          size_bytes: 42,
          source: "e2e-test",
        },
        correlation_id: correlationId,
      }),
    });

    expect(
      publishRes.status,
      `scp-publish returned unexpected status ${publishRes.status}`,
    ).toBe(201);

    const publishBody = (await publishRes.json()) as {
      event_id?: string;
      correlation_id?: string;
      occurred_at?: string;
    };

    expect(
      publishBody.event_id,
      "scp-publish must return event_id",
    ).toBeTruthy();
    expect(publishBody.correlation_id).toBe(correlationId);

    const eventId = publishBody.event_id as string;

    // 4. Verify event appears in kernel.scp_outbox via service_role
    const count = await getOutboxCount(SUPABASE_SERVICE_KEY, eventId);
    expect(count, `Event ${eventId} not found in kernel.scp_outbox`).toBe(1);
  });

  test("scp-publish rejects unauthenticated requests", async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip(true, "E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY not set");
      return;
    }

    const edgeFnUrl = `${SUPABASE_URL}/functions/v1/scp-publish`;
    const res = await fetch(edgeFnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "platform.file.uploaded",
        payload: {},
        correlation_id: crypto.randomUUID(),
      }),
    });

    expect([401, 403]).toContain(res.status);
  });

  test("scp-publish rejects unknown event_type", async () => {
    if (!hasRequiredEnv) {
      test.skip(true, "required env vars not set");
      return;
    }

    const jwt = await getJwt();
    expect(jwt).not.toBeNull();

    const edgeFnUrl = `${SUPABASE_URL}/functions/v1/scp-publish`;
    const res = await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        event_type: "unregistered.event.type",
        payload: {},
        correlation_id: crypto.randomUUID(),
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/não está registrado|not registered/i);
  });
});
