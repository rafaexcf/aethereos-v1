// Sprint 30 MX166: helper pra emitir alertas de segurança auto-detectados.
// INSERT em kernel.security_alerts via driver browser; best-effort: nunca
// throw, nunca bloqueia UI. RLS garante isolamento por company_id.

import type { CloudDrivers } from "./drivers";

export type SecurityAlertType =
  | "login_new_device"
  | "login_new_ip"
  | "login_failed_multiple"
  | "permission_change"
  | "bulk_data_access"
  | "mfa_disabled"
  | "member_removed"
  | "admin_added";

export type SecurityAlertSeverity = "info" | "warning" | "critical";

export interface EmitAlertParams {
  company_id: string;
  user_id?: string | null;
  alert_type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insere um alerta em kernel.security_alerts.
 * Best-effort silencioso: erros são engolidos (log via console.warn) — alertas
 * são telemetria de segurança, nunca devem quebrar a UX.
 */
export async function emitAlert(
  drivers: CloudDrivers | null,
  params: EmitAlertParams,
): Promise<void> {
  if (drivers === null) return;
  try {
    const row = {
      company_id: params.company_id,
      user_id: params.user_id ?? null,
      alert_type: params.alert_type,
      severity: params.severity,
      title: params.title,
      description: params.description,
      metadata: params.metadata ?? {},
    };
    const res = (await drivers.data
      .from("security_alerts")
      .insert(row)) as unknown as { error: { message: string } | null };
    if (res.error !== null && res.error !== undefined) {
      // Silencioso, mas observável em devtools.
      // eslint-disable-next-line no-console
      console.warn("[security-alerts] insert failed:", res.error.message);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    // eslint-disable-next-line no-console
    console.warn("[security-alerts] emit threw:", msg);
  }
}
