// Sprint 30 MX165: Sessões Ativas — lista real de sessões da equipe.
// Carrega kernel.login_history WHERE is_active=true e expõe encerrar
// individual + encerrar todas as outras (próprias).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Network, RefreshCw } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  Badge,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

interface LoginHistoryRow {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  login_at: string;
  last_seen_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
}

interface SessionView {
  id: string;
  user_id: string;
  full_name: string;
  user_agent_short: string;
  ip_address: string | null;
  last_seen_at: string;
}

type Toast = { id: number; message: string; variant: "success" | "error" };

function shortenUserAgent(ua: string | null): string {
  if (ua === null || ua.trim() === "") return "Navegador desconhecido";
  // Heurística simples — extrai browser + OS sem regex sofisticado.
  const lower = ua.toLowerCase();
  let browser = "Navegador";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/"))
    browser = "Safari";
  let os = "—";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os x") || lower.includes("macintosh"))
    os = "macOS";
  else if (lower.includes("linux")) os = "Linux";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  return `${browser} · ${os}`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "agora";
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)} h`;
  return `há ${Math.floor(diffSec / 86400)} d`;
}

export function TabSessoesAtivas() {
  const drivers = useDrivers();
  const { activeCompanyId, userId } = useSessionStore();

  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [endingAllOthers, setEndingAllOthers] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const pushToast = useCallback(
    (message: string, variant: Toast["variant"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  const loadSessions = useCallback(async () => {
    if (drivers === null || activeCompanyId === null) return;
    setLoading(true);
    try {
      const res = (await drivers.data
        .from("login_history")
        .select(
          "id,user_id,ip_address,user_agent,device_type,login_at,last_seen_at",
        )
        .eq("company_id", activeCompanyId)
        .eq("is_active", true)
        .order("last_seen_at", { ascending: false })) as unknown as {
        data: LoginHistoryRow[] | null;
        error: unknown;
      };
      if (res.error !== null && res.error !== undefined) {
        setSessions([]);
        return;
      }
      const rows = res.data ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      let profilesById: Record<string, string> = {};
      if (userIds.length > 0) {
        const profRes = (await drivers.data
          .from("profiles")
          .select("id,full_name")
          .in("id", userIds)) as unknown as {
          data: ProfileRow[] | null;
          error: unknown;
        };
        if (profRes.error === null && profRes.data !== null) {
          profilesById = profRes.data.reduce<Record<string, string>>(
            (acc, p) => {
              acc[p.id] = p.full_name ?? "Sem nome";
              return acc;
            },
            {},
          );
        }
      }
      const mapped: SessionView[] = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        full_name: profilesById[r.user_id] ?? "Sem nome",
        user_agent_short: shortenUserAgent(r.user_agent),
        ip_address: r.ip_address,
        last_seen_at: r.last_seen_at,
      }));
      setSessions(mapped);

      // Heurística pra "esta sessão": entrada mais recente do user atual com
      // user_agent matching navigator.userAgent. Persistimos em sessionStorage
      // pra estabilidade entre reloads do tab.
      const persisted = window.sessionStorage.getItem("aethereos.session.id");
      if (persisted !== null && rows.some((r) => r.id === persisted)) {
        setCurrentSessionId(persisted);
      } else if (userId !== null) {
        const own = rows.filter((r) => r.user_id === userId);
        const ownMatch =
          own.find((r) => r.user_agent === window.navigator.userAgent) ??
          own[0];
        if (ownMatch !== undefined) {
          setCurrentSessionId(ownMatch.id);
          window.sessionStorage.setItem("aethereos.session.id", ownMatch.id);
        }
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [drivers, activeCompanyId, userId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const callForceLogout = useCallback(
    async (
      targetUserId: string,
      opts: { allOtherForSelf: boolean },
    ): Promise<{ success: boolean; ended_count: number; error?: string }> => {
      if (drivers === null) {
        return { success: false, ended_count: 0, error: "Sem drivers" };
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as
        | string
        | undefined;
      if (supabaseUrl === undefined || supabaseUrl === "") {
        return { success: false, ended_count: 0, error: "Sem URL Supabase" };
      }
      const client = drivers.data.getClient();
      const {
        data: { session },
      } = await client.auth.getSession();
      const accessToken = session?.access_token ?? null;
      if (accessToken === null) {
        return { success: false, ended_count: 0, error: "Sessão expirada" };
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/force-logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: targetUserId,
          all_other_for_self: opts.allOtherForSelf,
          current_session_id: currentSessionId ?? "",
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        ended_count?: number;
        error?: string;
      };
      if (!res.ok || json.success !== true) {
        return {
          success: false,
          ended_count: 0,
          error: json.error ?? "Falha ao encerrar",
        };
      }
      return {
        success: true,
        ended_count: json.ended_count ?? 0,
      };
    },
    [drivers, currentSessionId],
  );

  async function handleEndOne(session: SessionView) {
    setBusyId(session.id);
    try {
      const result = await callForceLogout(session.user_id, {
        allOtherForSelf: false,
      });
      if (!result.success) {
        pushToast(result.error ?? "Falha ao encerrar sessão", "error");
        return;
      }
      pushToast(
        `${result.ended_count} sessão(ões) encerrada(s) de ${session.full_name}`,
        "success",
      );
      void loadSessions();
    } finally {
      setBusyId(null);
    }
  }

  async function handleEndAllOthers() {
    if (userId === null) return;
    setEndingAllOthers(true);
    try {
      const result = await callForceLogout(userId, {
        allOtherForSelf: true,
      });
      if (!result.success) {
        pushToast(result.error ?? "Falha ao encerrar outras", "error");
        return;
      }
      pushToast(
        result.ended_count > 0
          ? `${result.ended_count} outra(s) sessão(ões) encerrada(s)`
          : "Nenhuma outra sessão ativa",
        "success",
      );
      void loadSessions();
    } finally {
      setEndingAllOthers(false);
    }
  }

  const sortedSessions = useMemo(() => {
    if (currentSessionId === null) return sessions;
    return [...sessions].sort((a, b) => {
      if (a.id === currentSessionId) return -1;
      if (b.id === currentSessionId) return 1;
      return 0;
    });
  }, [sessions, currentSessionId]);

  const otherSessionsForSelfCount = useMemo(() => {
    if (userId === null) return 0;
    return sessions.filter(
      (s) => s.user_id === userId && s.id !== currentSessionId,
    ).length;
  }, [sessions, userId, currentSessionId]);

  if (drivers === null || activeCompanyId === null) {
    return (
      <div>
        <ContentHeader
          icon={Network}
          iconBg="rgba(99,102,241,0.14)"
          iconColor="#a5b4fc"
          title="Sessões Ativas"
          subtitle="Sessões em uso pela equipe"
        />
        <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Carregando contexto…
        </div>
      </div>
    );
  }

  return (
    <div>
      <ContentHeader
        icon={Network}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Sessões Ativas"
        subtitle={
          loading
            ? "Carregando sessões…"
            : `${sessions.length} sessão(ões) ativa(s) na empresa`
        }
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <InlineButton onClick={() => void loadSessions()}>
              <RefreshCw size={13} strokeWidth={2} />
              Atualizar
            </InlineButton>
            {otherSessionsForSelfCount > 0 && (
              <InlineButton
                variant="danger"
                onClick={() => {
                  if (!endingAllOthers) void handleEndAllOthers();
                }}
              >
                {endingAllOthers
                  ? "Encerrando…"
                  : `Encerrar todas as outras (${otherSessionsForSelfCount})`}
              </InlineButton>
            )}
          </div>
        }
      />

      <div>
        <SectionLabel>Sessões da equipe</SectionLabel>
        {loading ? (
          <div
            style={{
              padding: "32px 16px",
              fontSize: 13,
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}
          >
            Carregando…
          </div>
        ) : sortedSessions.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              border: "1px dashed rgba(255,255,255,0.10)",
              textAlign: "center",
            }}
          >
            <Network
              size={20}
              strokeWidth={1.6}
              style={{ color: "#a5b4fc", marginBottom: 10 }}
            />
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Nenhuma sessão ativa registrada
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                lineHeight: 1.5,
                maxWidth: 420,
                margin: "0 auto",
              }}
            >
              Sessões aparecem aqui à medida que colaboradores fazem login no
              shell.
            </div>
          </div>
        ) : (
          <SettingGroup>
            {sortedSessions.map((s, idx) => {
              const isLast = idx === sortedSessions.length - 1;
              const isCurrent = s.id === currentSessionId;
              const sublabel = `${s.user_agent_short} · ${s.ip_address ?? "—"} · último acesso ${formatRelative(s.last_seen_at)}`;
              return (
                <SettingRow
                  key={s.id}
                  label={s.full_name}
                  sublabel={sublabel}
                  last={isLast}
                >
                  {isCurrent && <Badge variant="success">Esta sessão</Badge>}
                  {!isCurrent && (
                    <InlineButton
                      variant="danger"
                      onClick={() => {
                        if (busyId !== s.id) void handleEndOne(s);
                      }}
                    >
                      {busyId === s.id ? "Encerrando…" : "Encerrar"}
                    </InlineButton>
                  )}
                </SettingRow>
              );
            })}
          </SettingGroup>
        )}
      </div>

      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 9999,
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background:
                  t.variant === "error"
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(16,185,129,0.15)",
                border:
                  t.variant === "error"
                    ? "1px solid rgba(239,68,68,0.35)"
                    : "1px solid rgba(16,185,129,0.35)",
                color: t.variant === "error" ? "#fca5a5" : "#34d399",
                fontSize: 13,
                maxWidth: 360,
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
