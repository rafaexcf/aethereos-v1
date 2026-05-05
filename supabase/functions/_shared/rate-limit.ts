// Sprint 27 MX147: helper de rate limiting compartilhado.
// Chama kernel.check_and_increment_rate_limit() via service_role.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  admin: SupabaseClient,
  subject: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await admin
    .schema("kernel")
    .rpc("check_and_increment_rate_limit", {
      subject_in: subject,
      bucket_in: bucket,
      limit_in: limit,
      window_seconds_in: windowSeconds,
    });
  // Falhou silenciosamente: deixa passar pra não quebrar fluxo. Logging
  // estruturado pode ser adicionado quando OTel for wired.
  if (error !== null || data === null) {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
  // RPC retorna array [{ allowed, remaining, retry_after_seconds }].
  const row = Array.isArray(data) ? data[0] : data;
  if (row === undefined || row === null) {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
  return {
    allowed: row.allowed === true,
    remaining: typeof row.remaining === "number" ? row.remaining : 0,
    retryAfterSeconds:
      typeof row.retry_after_seconds === "number" ? row.retry_after_seconds : 0,
  };
}

export function rateLimitResponse(
  result: RateLimitResult,
  cors: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Muitas requisições. Tente novamente em alguns instantes.",
      retry_after_seconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
