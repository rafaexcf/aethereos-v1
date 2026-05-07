// Sprint 28 MX153: Cargos & Hierarquia — referencia das 5 roles base do kernel
// (estaticas, R11) + CRUD completo de cargos customizaveis (kernel.company_roles).
// Cada cargo customizado mapeia para uma role base (admin/manager/member/viewer);
// "owner" eh exclusao por R11 — apenas o proprietario original da empresa.
//
// Persistencia: drivers.data.from("company_roles") com RLS por company_id.
// UNIQUE (company_id, label) — capturado em try/catch pra mensagem de UI.
// Excluir cascateia tenant_memberships.custom_role_id pra NULL (FK SET NULL),
// mas tambem fazemos UPDATE explicito pra dar feedback imediato na UI.

import { useEffect, useState, useCallback, type ComponentType } from "react";
import {
  Network,
  Plus,
  X,
  Crown,
  ShieldCheck,
  Briefcase,
  User,
  Eye,
  type LucideProps,
} from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  Badge,
  ComingSoonSection,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

// ─── Roles base do kernel (R11) ───────────────────────────────────────────

type BaseRole = "admin" | "manager" | "member" | "viewer";

interface KernelRoleEntry {
  label: string;
  slug: BaseRole | "owner";
  scope: string;
  icon: ComponentType<LucideProps>;
  color: string;
}

const KERNEL_ROLES: KernelRoleEntry[] = [
  {
    label: "Proprietário",
    slug: "owner",
    scope: "Acesso total · billing, governança, exclusão de empresa",
    icon: Crown,
    color: "#fbbf24",
  },
  {
    label: "Administrador",
    slug: "admin",
    scope: "Gestão completa exceto billing e exclusão de empresa",
    icon: ShieldCheck,
    color: "#a5b4fc",
  },
  {
    label: "Gestor de setor",
    slug: "manager",
    scope: "Gestão limitada ao seu departamento e equipe direta",
    icon: Briefcase,
    color: "#34d399",
  },
  {
    label: "Colaborador",
    slug: "member",
    scope: "Acesso operacional aos apps liberados pelo gestor",
    icon: User,
    color: "#60a5fa",
  },
  {
    label: "Visualizador",
    slug: "viewer",
    scope: "Apenas leitura — sem permissão de criar ou editar",
    icon: Eye,
    color: "#94a3b8",
  },
];

const BASE_ROLE_OPTIONS: { value: BaseRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gestor de setor" },
  { value: "member", label: "Colaborador" },
  { value: "viewer", label: "Visualizador" },
];

// ─── Tipos de domínio ─────────────────────────────────────────────────────

interface CompanyRoleRow {
  id: string;
  label: string;
  base_role: BaseRole;
  description: string | null;
}

interface CompanyRoleWithCount extends CompanyRoleRow {
  memberCount: number;
}

// ─── Helpers visuais ──────────────────────────────────────────────────────

function RoleIconCircle({
  Icon,
  color,
}: {
  Icon: ComponentType<LucideProps>;
  color: string;
}) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: `${color}28`,
        border: `1px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={14} strokeWidth={1.8} style={{ color }} />
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
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── Modal de create/edit ─────────────────────────────────────────────────

interface RoleModalProps {
  initial: CompanyRoleRow | null;
  onClose: () => void;
  onSubmit: (payload: {
    id: string | null;
    label: string;
    base_role: BaseRole;
    description: string;
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
}

function RoleModal({ initial, onClose, onSubmit }: RoleModalProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [baseRole, setBaseRole] = useState<BaseRole>(
    initial?.base_role ?? "member",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = label.trim();
    if (trimmed === "") {
      setErrorMsg("Informe um nome para o cargo.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    const result = await onSubmit({
      id: initial?.id ?? null,
      label: trimmed,
      base_role: baseRole,
      description: description.trim(),
    });
    if (result.ok) {
      onClose();
    } else {
      setErrorMsg(result.message);
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
        role="dialog"
        aria-modal="true"
        aria-label={initial !== null ? "Editar cargo" : "Criar cargo"}
        style={{
          width: 460,
          borderRadius: 16,
          background: "var(--bg-elevated, #1e2328)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.5))",
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
            {initial !== null ? "Editar cargo" : "Criar cargo"}
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
          <Field label="Nome do cargo">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Diretor Financeiro"
              style={inputStyle}
              autoFocus
            />
          </Field>
          <Field label="Role base (kernel)">
            <select
              value={baseRole}
              onChange={(e) => setBaseRole(e.target.value as BaseRole)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {BASE_ROLE_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{ background: "#191d21" }}
                >
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Descrição (opcional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Como esse cargo se diferencia da role base?"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
            />
          </Field>
        </div>

        {errorMsg !== null && (
          <div
            style={{
              marginTop: 14,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.32)",
              color: "#fca5a5",
              fontSize: 12,
            }}
          >
            {errorMsg}
          </div>
        )}

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
            disabled={submitting || label.trim() === ""}
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
              opacity: submitting || label.trim() === "" ? 0.6 : 1,
            }}
          >
            {submitting
              ? "Salvando…"
              : initial !== null
                ? "Salvar alterações"
                : "Criar cargo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export function TabCargosHierarquia() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [roles, setRoles] = useState<CompanyRoleWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRoleRow | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const triggerReload = useCallback(() => {
    setReloadCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const rolesRes = (await drivers.data
          .from("company_roles")
          .select("id,label,base_role,description")
          .eq("company_id", activeCompanyId)
          .order("label")) as unknown as {
          data: CompanyRoleRow[] | null;
          error: { message: string } | null;
        };
        if (cancelled) return;
        if (rolesRes.error !== null || rolesRes.data === null) {
          setRoles([]);
          setLoading(false);
          return;
        }

        // Conta membros por cargo (uma chamada por cargo — lista pequena).
        const withCounts: CompanyRoleWithCount[] = await Promise.all(
          rolesRes.data.map(async (r) => {
            try {
              const countRes = (await drivers.data
                .from("tenant_memberships")
                .select("custom_role_id", { count: "exact", head: true })
                .eq("company_id", activeCompanyId)
                .eq("custom_role_id", r.id)) as unknown as {
                count: number | null;
                error: { message: string } | null;
              };
              return {
                ...r,
                memberCount:
                  countRes.error !== null ? 0 : (countRes.count ?? 0),
              };
            } catch {
              return { ...r, memberCount: 0 };
            }
          }),
        );

        if (cancelled) return;
        setRoles(withCounts);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setRoles([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, activeCompanyId, reloadCounter]);

  async function handleSubmit(payload: {
    id: string | null;
    label: string;
    base_role: BaseRole;
    description: string;
  }): Promise<{ ok: true } | { ok: false; message: string }> {
    if (drivers === null || activeCompanyId === null) {
      return { ok: false, message: "Drivers não disponíveis." };
    }
    try {
      if (payload.id !== null) {
        const res = (await drivers.data
          .from("company_roles")
          .update({
            label: payload.label,
            base_role: payload.base_role,
            description: payload.description,
          })
          .eq("id", payload.id)
          .eq("company_id", activeCompanyId)) as unknown as {
          error: { message: string; code?: string } | null;
        };
        if (res.error !== null) {
          return { ok: false, message: friendlyError(res.error) };
        }
      } else {
        const res = (await drivers.data.from("company_roles").insert({
          company_id: activeCompanyId,
          label: payload.label,
          base_role: payload.base_role,
          description: payload.description,
        })) as unknown as {
          error: { message: string; code?: string } | null;
        };
        if (res.error !== null) {
          return { ok: false, message: friendlyError(res.error) };
        }
      }
      triggerReload();
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Erro inesperado.",
      };
    }
  }

  async function handleDelete(role: CompanyRoleWithCount) {
    if (drivers === null || activeCompanyId === null) return;
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm(
        `Excluir cargo "${role.label}"? ${
          role.memberCount > 0
            ? `${role.memberCount} pessoa(s) ficarão sem cargo customizado (mantém role base).`
            : ""
        }`,
      );
    if (!confirmed) return;

    try {
      // explicit nullify — FK SET NULL faria isso, mas o explicit dá feedback imediato.
      try {
        await drivers.data
          .from("tenant_memberships")
          .update({ custom_role_id: null })
          .eq("company_id", activeCompanyId)
          .eq("custom_role_id", role.id);
      } catch {
        // best-effort — FK ON DELETE SET NULL cobre caso falhe.
      }
      await drivers.data
        .from("company_roles")
        .delete()
        .eq("id", role.id)
        .eq("company_id", activeCompanyId);
      triggerReload();
    } catch {
      // silencioso — UI vai recarregar e refletir estado real.
    }
  }

  const subtitle = loading
    ? "Carregando cargos da empresa…"
    : roles.length === 0
      ? "5 roles padrão do kernel · nenhum cargo customizado ainda"
      : `5 roles padrão do kernel · ${roles.length} cargo(s) customizado(s)`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ContentHeader
        icon={Network}
        iconBg="rgba(99,102,241,0.18)"
        iconColor="#a5b4fc"
        title="Cargos & Hierarquia"
        subtitle={subtitle}
      />

      <div>
        <SectionLabel>Hierarquia padrão (kernel)</SectionLabel>
        <SettingGroup>
          {KERNEL_ROLES.map((r, i) => (
            <SettingRow
              key={r.slug}
              last={i === KERNEL_ROLES.length - 1}
              label={r.label}
              sublabel={r.scope}
              icon={<RoleIconCircle Icon={r.icon} color={r.color} />}
            >
              <Badge variant="neutral">{r.slug}</Badge>
            </SettingRow>
          ))}
        </SettingGroup>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <SectionLabel>Cargos customizados</SectionLabel>
          <InlineButton
            variant="primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={13} strokeWidth={2} />
            Criar cargo
          </InlineButton>
        </div>

        {loading ? (
          <SettingGroup>
            <SettingRow label="Carregando…" sublabel="Aguarde" last />
          </SettingGroup>
        ) : roles.length === 0 ? (
          <ComingSoonSection
            icon={Network}
            label="Nenhum cargo customizado ainda"
            description='Crie cargos friendly (ex: "Diretor Financeiro") que mapeiam para uma role base do kernel — mantém a hierarquia operacional intacta.'
          />
        ) : (
          <SettingGroup>
            {roles.map((r, i) => (
              <SettingRow
                key={r.id}
                last={i === roles.length - 1}
                label={r.label}
                sublabel={`Base: ${r.base_role} · ${
                  r.description !== null && r.description.trim() !== ""
                    ? r.description
                    : "—"
                } · ${r.memberCount} pessoa(s) com esse cargo`}
              >
                <InlineButton
                  onClick={() => {
                    setEditing({
                      id: r.id,
                      label: r.label,
                      base_role: r.base_role,
                      description: r.description,
                    });
                    setModalOpen(true);
                  }}
                >
                  Editar
                </InlineButton>
                <InlineButton
                  variant="danger"
                  onClick={() => void handleDelete(r)}
                >
                  Excluir
                </InlineButton>
              </SettingRow>
            ))}
          </SettingGroup>
        )}
      </div>

      {modalOpen && (
        <RoleModal
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function friendlyError(error: { message: string; code?: string }): string {
  // Postgres unique violation code = 23505
  if (
    error.code === "23505" ||
    /duplicate key|unique constraint/i.test(error.message)
  ) {
    return "Já existe um cargo com esse nome nesta empresa.";
  }
  return error.message || "Não foi possível salvar.";
}
