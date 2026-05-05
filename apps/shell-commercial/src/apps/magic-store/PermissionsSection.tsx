import { useCallback, useEffect, useState } from "react";
import { Lock, ShieldCheck, X } from "lucide-react";
import { BASE_SCOPE, getScope } from "@aethereos/client";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useInstalledModulesStore } from "../../stores/installedModulesStore";

/**
 * Sprint 23 MX128 — secao "Permissoes" no detail view do Magic Store.
 *
 * Carrega grants de kernel.app_permission_grants para o app+company
 * atual. Usuario pode revogar cada scope individualmente exceto
 * BASE_SCOPE (auth.read), que eh implicito para qualquer app.
 */

interface Props {
  appId: string;
  installed: boolean;
}

export function PermissionsSection({ appId, installed }: Props) {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const activeCompanyId = useSessionStore((s) => s.activeCompanyId);
  const revokeScope = useInstalledModulesStore((s) => s.revokeScope);
  const [grants, setGrants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (
      !installed ||
      drivers === null ||
      activeCompanyId === null ||
      userId === null
    ) {
      setGrants([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = (await drivers.data
        .from("app_permission_grants")
        .select("scope")
        .eq("company_id", activeCompanyId)
        .eq("app_id", appId)) as unknown as {
        data: Array<{ scope: string }> | null;
        error: { message: string } | null;
      };
      if (cancelled) return;
      const scopes = (res.data ?? []).map((r) => r.scope);
      // Inclui BASE_SCOPE implicito mesmo se nao gravado
      if (!scopes.includes(BASE_SCOPE)) scopes.unshift(BASE_SCOPE);
      setGrants(scopes);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, activeCompanyId, userId, appId, installed, reloadTick]);

  const handleRevoke = useCallback(
    async (scope: string) => {
      if (drivers === null || activeCompanyId === null) return;
      if (scope === BASE_SCOPE) return;
      setRevoking(scope);
      await revokeScope(drivers, activeCompanyId, appId, scope);
      setRevoking(null);
      setReloadTick((t) => t + 1);
    },
    [drivers, activeCompanyId, appId, revokeScope],
  );

  if (!installed) return null;

  return (
    <section
      style={{
        padding: 20,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <ShieldCheck size={16} color="var(--text-secondary)" />
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Permissoes concedidas
        </h3>
      </header>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Carregando…
        </div>
      ) : grants.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Nenhuma permissao concedida ainda.
        </div>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {grants.map((scope) => {
            const def = getScope(scope);
            const label = def?.label ?? scope;
            const desc = def?.description ?? "";
            const sensitive = def?.sensitive === true;
            const isBase = scope === BASE_SCOPE;
            return (
              <li
                key={scope}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: sensitive
                    ? "rgba(245,158,11,0.05)"
                    : "rgba(255,255,255,0.03)",
                  border: sensitive
                    ? "1px solid rgba(245,158,11,0.2)"
                    : "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 8,
                }}
              >
                <Lock
                  size={13}
                  color={sensitive ? "#f59e0b" : "var(--text-tertiary)"}
                  style={{ flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{label}</span>
                    {sensitive && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 5px",
                          background: "rgba(245,158,11,0.18)",
                          color: "#fde68a",
                          border: "1px solid rgba(245,158,11,0.3)",
                          borderRadius: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Sensivel
                      </span>
                    )}
                    {isBase && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 5px",
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--text-tertiary)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Obrigatorio
                      </span>
                    )}
                  </div>
                  {desc !== "" && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      {desc}
                    </div>
                  )}
                </div>
                {!isBase && (
                  <button
                    type="button"
                    onClick={() => void handleRevoke(scope)}
                    disabled={revoking === scope}
                    aria-label={`Revogar ${label}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 9px",
                      fontSize: 11,
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 5,
                      cursor: revoking === scope ? "wait" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <X size={11} />
                    Revogar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p
        style={{
          margin: "4px 0 0",
          fontSize: 10,
          color: "var(--text-tertiary)",
        }}
      >
        Revogar uma permissao bloqueia o app de chamar metodos relacionados via
        bridge. O BASE_SCOPE (Identidade) nao pode ser revogado.
      </p>
    </section>
  );
}
