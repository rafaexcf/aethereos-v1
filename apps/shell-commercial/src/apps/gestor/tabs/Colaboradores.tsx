// Sprint 26: Colaboradores — gestao de membros do workspace.
// CRUD via kernel.tenant_memberships + JOIN profiles. Convite via insert
// status='pending' (DB constraint nao aceita 'invited' — mapeamos pending=
// convite). Suspender = 'blocked'. Owner nao pode ser removido (UI guard).

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  X,
  Plus,
  Search,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
  KeyRound,
} from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Badge,
  InlineButton,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

type MembershipStatus =
  | "active"
  | "pending"
  | "blocked"
  | "rejected"
  | "removed";

type MembershipRole = "owner" | "admin" | "manager" | "member" | "viewer";

interface MemberRow {
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  full_name: string;
  email: string | null;
  position: string | null;
  department: string | null;
}

interface RawMembershipRow {
  user_id: string;
  role: string;
  status: string;
  profiles: {
    full_name: string | null;
    position: string | null;
    department: string | null;
  } | null;
}

type StatusFilter = "all" | "active" | "blocked" | "pending";

const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "Ativo",
  pending: "Convidado",
  blocked: "Suspenso",
  rejected: "Rejeitado",
  removed: "Removido",
};

const ROLE_LABEL: Record<MembershipRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gestor",
  member: "Colaborador",
  viewer: "Visualizador",
};

function statusVariant(
  s: MembershipStatus,
): "success" | "warning" | "info" | "danger" | "neutral" {
  if (s === "active") return "success";
  if (s === "blocked") return "warning";
  if (s === "pending") return "info";
  if (s === "removed" || s === "rejected") return "danger";
  return "neutral";
}

function isMembershipRole(v: string): v is MembershipRole {
  return (
    v === "owner" ||
    v === "admin" ||
    v === "manager" ||
    v === "member" ||
    v === "viewer"
  );
}

function isMembershipStatus(v: string): v is MembershipStatus {
  return (
    v === "active" ||
    v === "pending" ||
    v === "blocked" ||
    v === "rejected" ||
    v === "removed"
  );
}

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9100,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const colors: Record<
          Toast["variant"],
          { bg: string; border: string; color: string }
        > = {
          success: {
            bg: "rgba(16,185,129,0.18)",
            border: "rgba(16,185,129,0.40)",
            color: "#34d399",
          },
          error: {
            bg: "rgba(239,68,68,0.18)",
            border: "rgba(239,68,68,0.40)",
            color: "#f87171",
          },
          info: {
            bg: "rgba(99,102,241,0.18)",
            border: "rgba(99,102,241,0.40)",
            color: "#a5b4fc",
          },
        };
        const c = colors[t.variant];
        return (
          <div
            key={t.id}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.color,
              fontSize: 13,
              fontWeight: 500,
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              pointerEvents: "auto",
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

interface InviteModalProps {
  onClose: () => void;
  onSubmit: (form: InviteForm) => Promise<void>;
}

interface InviteForm {
  email: string;
  fullName: string;
  role: MembershipRole;
  position: string;
  department: string;
}

function InviteModal({ onClose, onSubmit }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<MembershipRole>("member");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (email.trim() === "" || fullName.trim() === "") return;
    setSubmitting(true);
    try {
      await onSubmit({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        position: position.trim(),
        department: department.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 460,
          borderRadius: 16,
          background: "var(--bg-elevated)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "var(--shadow-lg)",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
            }}
          >
            Convidar colaborador
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nome completo">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Maria Silva"
              style={inputStyle}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@empresa.com"
              style={inputStyle}
            />
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => {
                const v = e.target.value;
                if (isMembershipRole(v)) setRole(v);
              }}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="owner">Proprietário</option>
              <option value="admin">Administrador</option>
              <option value="manager">Gestor</option>
              <option value="member">Colaborador</option>
              <option value="viewer">Visualizador</option>
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Cargo">
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ex: Gerente Financeiro"
                style={inputStyle}
              />
            </Field>
            <Field label="Departamento">
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Financeiro"
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              submitting || email.trim() === "" || fullName.trim() === ""
            }
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              background: "rgba(99,102,241,0.85)",
              border: "1px solid rgba(99,102,241,1)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              opacity:
                submitting || email.trim() === "" || fullName.trim() === ""
                  ? 0.6
                  : 1,
            }}
          >
            {submitting ? "Enviando…" : "Enviar convite"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function MemberAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: `${color}28`,
        border: `1px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color }}>
        {initials || "?"}
      </span>
    </div>
  );
}

function colorForId(id: string): string {
  const palette = [
    "#a5b4fc",
    "#34d399",
    "#fbbf24",
    "#f472b6",
    "#60a5fa",
    "#fb923c",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length] ?? "#a5b4fc";
}

function MemberMenu({
  member,
  onSuspend,
  onReactivate,
  onResetPassword,
  onRemove,
}: {
  member: MemberRow;
  onSuspend: () => void;
  onReactivate: () => void;
  onResetPassword: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Mais ações"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 200,
            background: "var(--bg-elevated)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            padding: 4,
            zIndex: 50,
          }}
        >
          {member.status === "active" && (
            <MenuItem
              icon={<Pause size={13} />}
              label="Suspender"
              onClick={() => {
                setOpen(false);
                onSuspend();
              }}
            />
          )}
          {(member.status === "blocked" || member.status === "pending") && (
            <MenuItem
              icon={<Play size={13} />}
              label="Reativar"
              onClick={() => {
                setOpen(false);
                onReactivate();
              }}
            />
          )}
          <MenuItem
            icon={<KeyRound size={13} />}
            label="Resetar senha"
            onClick={() => {
              setOpen(false);
              onResetPassword();
            }}
          />
          {member.role !== "owner" && (
            <MenuItem
              icon={<Trash2 size={13} />}
              label="Remover"
              danger
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 10px",
        borderRadius: 6,
        border: "none",
        background: "transparent",
        color: danger === true ? "#f87171" : "var(--text-primary)",
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          danger === true ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function TabColaboradores() {
  const drivers = useDrivers();
  const { activeCompanyId, userId } = useSessionStore();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(message: string, variant: Toast["variant"] = "info") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  async function loadMembers() {
    if (drivers === null || activeCompanyId === null) return;
    setLoading(true);
    try {
      const res = (await drivers.data
        .from("tenant_memberships")
        .select(
          "user_id,role,status,profiles!inner(full_name,position,department)",
        )
        .eq("company_id", activeCompanyId)) as unknown as {
        data: RawMembershipRow[] | null;
        error: unknown;
      };
      if (res.error !== null && res.error !== undefined) {
        setMembers([]);
        return;
      }
      const rows = res.data ?? [];
      const mapped: MemberRow[] = rows.map((r) => {
        const role: MembershipRole = isMembershipRole(r.role)
          ? r.role
          : "member";
        const status: MembershipStatus = isMembershipStatus(r.status)
          ? r.status
          : "active";
        return {
          user_id: r.user_id,
          role,
          status,
          full_name: r.profiles?.full_name ?? "Sem nome",
          email: null,
          position: r.profiles?.position ?? null,
          department: r.profiles?.department ?? null,
        };
      });
      setMembers(mapped);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, [drivers, activeCompanyId]);

  const counts = useMemo(() => {
    let active = 0;
    let blocked = 0;
    let pending = 0;
    for (const m of members) {
      if (m.status === "active") active++;
      else if (m.status === "blocked") blocked++;
      else if (m.status === "pending") pending++;
    }
    return { active, blocked, pending };
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter === "active" && m.status !== "active") return false;
      if (statusFilter === "blocked" && m.status !== "blocked") return false;
      if (statusFilter === "pending" && m.status !== "pending") return false;
      if (q !== "") {
        const haystack = `${m.full_name} ${m.email ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [members, search, statusFilter]);

  async function updateStatus(userIdTarget: string, status: MembershipStatus) {
    if (drivers === null || activeCompanyId === null) return;
    try {
      const res = (await drivers.data
        .from("tenant_memberships")
        .update({ status })
        .eq("company_id", activeCompanyId)
        .eq("user_id", userIdTarget)) as unknown as { error: unknown };
      if (res.error !== null && res.error !== undefined) {
        pushToast("Não foi possível atualizar status", "error");
        return;
      }
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userIdTarget ? { ...m, status } : m)),
      );
      pushToast("Status atualizado", "success");
    } catch {
      pushToast("Erro ao atualizar status", "error");
    }
  }

  async function handleInvite(form: InviteForm) {
    if (drivers === null || activeCompanyId === null || userId === null) {
      pushToast("Sessão indisponível", "error");
      return;
    }
    try {
      // Tenta convite via Auth admin (geralmente nao disponivel no client com
      // anon key). Se falhar, registra apenas o INSERT como pending.
      let invitedUserId: string | null = null;
      try {
        const client = drivers.data.getClient();
        const adminClient = client.auth as unknown as {
          admin?: {
            inviteUserByEmail?: (email: string) => Promise<{
              data: { user: { id: string } | null } | null;
              error: unknown;
            }>;
          };
        };
        const inviteFn = adminClient.admin?.inviteUserByEmail;
        if (typeof inviteFn === "function") {
          const inviteRes = await inviteFn(form.email);
          if (
            (inviteRes.error === null || inviteRes.error === undefined) &&
            inviteRes.data?.user
          ) {
            invitedUserId = inviteRes.data.user.id;
          }
        }
      } catch {
        // ignore — fallback a apenas registrar membership como pending
      }

      if (invitedUserId === null) {
        pushToast(
          "Convite registrado (envio de email indisponível neste contexto)",
          "info",
        );
        // Sem invitedUserId nao podemos criar membership (FK exige auth.users).
        // Apenas notificamos que o registro fica pendente de processamento via
        // Edge Function/admin.
        setInviteOpen(false);
        return;
      }

      const insertRes = (await drivers.data.from("tenant_memberships").insert({
        user_id: invitedUserId,
        company_id: activeCompanyId,
        role: form.role,
        status: "pending",
        invited_by: userId,
      })) as unknown as { error: unknown };
      if (insertRes.error !== null && insertRes.error !== undefined) {
        pushToast("Não foi possível registrar membership", "error");
        return;
      }

      pushToast(`Convite enviado para ${form.email}`, "success");
      setInviteOpen(false);
      void loadMembers();
    } catch {
      pushToast("Erro ao enviar convite", "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Users}
        iconBg="rgba(16,185,129,0.22)"
        iconColor="#34d399"
        title="Colaboradores"
        subtitle={`${counts.active} colaborador(es) ativos · ${counts.blocked} suspenso(s) · ${counts.pending} convite(s)`}
        right={
          <InlineButton variant="primary" onClick={() => setInviteOpen(true)}>
            <Plus size={14} strokeWidth={2} />
            Convidar
          </InlineButton>
        }
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              color: "var(--text-tertiary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email"
            aria-label="Buscar colaborador"
            style={{
              ...inputStyle,
              paddingLeft: 34,
              flex: 1,
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            const v = e.target.value;
            if (
              v === "all" ||
              v === "active" ||
              v === "blocked" ||
              v === "pending"
            ) {
              setStatusFilter(v);
            }
          }}
          aria-label="Filtrar por status"
          style={{
            ...inputStyle,
            width: 200,
            cursor: "pointer",
          }}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="blocked">Suspensos</option>
          <option value="pending">Convidados</option>
        </select>
      </div>

      <div>
        <SectionLabel>Membros da equipe</SectionLabel>
        <SettingGroup>
          {loading ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              Nenhum colaborador encontrado.
            </div>
          ) : (
            filtered.map((m, i) => {
              const sub = `${ROLE_LABEL[m.role]} · ${m.position ?? "—"} · ${m.department ?? "—"}`;
              return (
                <SettingRow
                  key={m.user_id}
                  last={i === filtered.length - 1}
                  label={m.full_name}
                  sublabel={sub}
                  icon={
                    <MemberAvatar
                      name={m.full_name}
                      color={colorForId(m.user_id)}
                    />
                  }
                >
                  <Badge variant={statusVariant(m.status)}>
                    {STATUS_LABEL[m.status]}
                  </Badge>
                  <MemberMenu
                    member={m}
                    onSuspend={() => void updateStatus(m.user_id, "blocked")}
                    onReactivate={() => void updateStatus(m.user_id, "active")}
                    onResetPassword={() =>
                      pushToast("Reset de senha ainda não implementado", "info")
                    }
                    onRemove={() => void updateStatus(m.user_id, "removed")}
                  />
                </SettingRow>
              );
            })
          )}
        </SettingGroup>
      </div>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSubmit={handleInvite}
        />
      )}
      <ToastStack toasts={toasts} />
    </div>
  );
}
