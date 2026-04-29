import { NextResponse } from "next/server";

interface CheckResult {
  ok: boolean;
  latency_ms: number;
  error?: string | undefined;
}

async function checkService(
  name: string,
  url: string,
  timeoutMs = 3000,
): Promise<[string, CheckResult]> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return [
      name,
      {
        ok: res.ok,
        latency_ms: Date.now() - start,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      },
    ];
  } catch (e) {
    return [
      name,
      {
        ok: false,
        latency_ms: Date.now() - start,
        error: e instanceof Error ? e.message : String(e),
      },
    ];
  }
}

export async function GET(): Promise<NextResponse> {
  const checks = await Promise.all([
    checkService(
      "supabase",
      `${process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "http://localhost:54321"}/rest/v1/`,
    ),
    checkService(
      "litellm",
      `${process.env["LITELLM_BASE_URL"] ?? "http://localhost:4000"}/health`,
    ),
    checkService(
      "unleash",
      `${process.env["UNLEASH_URL"] ?? "http://localhost:4242"}/health`,
    ),
    checkService(
      "otel-collector",
      `${process.env["OTEL_HEALTH_URL"] ?? "http://localhost:13133"}/`,
    ),
  ]);

  const results = Object.fromEntries(checks);
  const allOk = Object.values(results).every((r) => r.ok);

  return NextResponse.json(
    {
      status: allOk ? "ready" : "degraded",
      app: "comercio-digital",
      ts: new Date().toISOString(),
      checks: results,
    },
    { status: allOk ? 200 : 503 },
  );
}
