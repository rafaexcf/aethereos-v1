// Sprint 28 (MX151): Departamentos — CRUD real via drivers.data com RLS por
// company_id. Inclui modal de criar/editar, gerenciamento de membros (N:N
// via kernel.department_members) e seleção opcional de manager_user_id de
// admins/managers ativos da company.

import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, X, Edit, Trash2, UserPlus } from "lucide-react";
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

interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  manager_user_id: string | null;
}

interface DepartmentMemberRow {
  id: string;
  user_id: string;
}

interface DepartmentMemberWithProfile extends DepartmentMemberRow {
  full_name: string;
  position: string | null;
}

interface MembershipProfileRow {
  user_id: string;
  role: string;
  status: string;
  profiles: {
    full_name: string | null;
    position: string | null;
  } | null;
}

interface CompanyMember {
  user_id: string;
  full_name: string;
  position: string | null;
  role: string;
  status: string;
}

const MANAGER_ROLES = new Set(["owner", "admin", "manager"]);

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  marginBottom: 6,
};

interface ModalState {
  mode: "create" | "edit";
  department: DepartmentRow | null;
}

export function TabDepartamentos() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [memberCountByDept, setMemberCountByDept] = useState<
    Record<string, number>
  >({});
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftManagerUserId, setDraftManagerUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [editingMembers, setEditingMembers] = useState<
    DepartmentMemberWithProfile[]
  >([]);
  const [pendingMemberAdd, setPendingMemberAdd] = useState<string>("");

  async function loadAll() {
    if (drivers === null || activeCompanyId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [depsRes, memsRes, profsRes] = await Promise.all([
        drivers.data
          .from("departments")
          .select("id,name,description,manager_user_id")
          .eq("company_id", activeCompanyId)
          .order("name") as unknown as Promise<{
          data: DepartmentRow[] | null;
          error: unknown;
        }>,
        drivers.data
          .from("department_members")
          .select("id,department_id,user_id")
          .eq("company_id", activeCompanyId) as unknown as Promise<{
          data: { id: string; department_id: string; user_id: string }[] | null;
          error: unknown;
        }>,
        drivers.data
          .from("tenant_memberships")
          .select("user_id,role,status,profiles!inner(full_name,position)")
          .eq("company_id", activeCompanyId) as unknown as Promise<{
          data: MembershipProfileRow[] | null;
          error: unknown;
        }>,
      ]);

      const deps = depsRes.data ?? [];
      const mems = memsRes.data ?? [];
      const profs = profsRes.data ?? [];

      const counts: Record<string, number> = {};
      for (const m of mems) {
        counts[m.department_id] = (counts[m.department_id] ?? 0) + 1;
      }

      const members: CompanyMember[] = profs.map((p) => ({
        user_id: p.user_id,
        full_name: p.profiles?.full_name ?? "Sem nome",
        position: p.profiles?.position ?? null,
        role: p.role,
        status: p.status,
      }));

      setDepartments(deps);
      setMemberCountByDept(counts);
      setCompanyMembers(members);
    } catch {
      setDepartments([]);
      setMemberCountByDept({});
      setCompanyMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [drivers, activeCompanyId]);

  async function loadEditingMembers(departmentId: string) {
    if (drivers === null || activeCompanyId === null) {
      setEditingMembers([]);
      return;
    }
    try {
      const res = (await drivers.data
        .from("department_members")
        .select("id,user_id,profiles!inner(full_name,position)")
        .eq("company_id", activeCompanyId)
        .eq("department_id", departmentId)) as unknown as {
        data:
          | {
              id: string;
              user_id: string;
              profiles: {
                full_name: string | null;
                position: string | null;
              } | null;
            }[]
          | null;
        error: unknown;
      };
      const rows = res.data ?? [];
      setEditingMembers(
        rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          full_name: r.profiles?.full_name ?? "Sem nome",
          position: r.profiles?.position ?? null,
        })),
      );
    } catch {
      setEditingMembers([]);
    }
  }

  function openCreate() {
    setModal({ mode: "create", department: null });
    setDraftName("");
    setDraftDescription("");
    setDraftManagerUserId("");
    setEditingMembers([]);
    setPendingMemberAdd("");
  }

  function openEdit(dep: DepartmentRow) {
    setModal({ mode: "edit", department: dep });
    setDraftName(dep.name);
    setDraftDescription(dep.description ?? "");
    setDraftManagerUserId(dep.manager_user_id ?? "");
    setPendingMemberAdd("");
    void loadEditingMembers(dep.id);
  }

  function closeModal() {
    setModal(null);
  }

  async function handleSubmit() {
    if (drivers === null || activeCompanyId === null) return;
    const name = draftName.trim();
    if (name === "") {
      window.alert("Informe um nome para o departamento.");
      return;
    }
    setSubmitting(true);
    try {
      const description = draftDescription.trim() || null;
      const manager =
        draftManagerUserId.trim() === "" ? null : draftManagerUserId;
      if (modal?.mode === "create") {
        const res = (await drivers.data.from("departments").insert({
          company_id: activeCompanyId,
          name,
          description,
          manager_user_id: manager,
        })) as unknown as { error: unknown };
        if (res.error !== null && res.error !== undefined) {
          window.alert("Não foi possível criar o departamento.");
          return;
        }
      } else if (modal?.mode === "edit" && modal.department !== null) {
        const res = (await drivers.data
          .from("departments")
          .update({
            name,
            description,
            manager_user_id: manager,
          })
          .eq("id", modal.department.id)
          .eq("company_id", activeCompanyId)) as unknown as {
          error: unknown;
        };
        if (res.error !== null && res.error !== undefined) {
          window.alert("Não foi possível salvar o departamento.");
          return;
        }
      }
      await loadAll();
      closeModal();
    } catch {
      window.alert("Erro inesperado ao salvar departamento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(dep: DepartmentRow) {
    if (drivers === null || activeCompanyId === null) return;
    const ok = window.confirm(
      `Excluir o departamento "${dep.name}"?\n\nIsso removerá todos os vínculos de membros associados.`,
    );
    if (!ok) return;
    try {
      const res = (await drivers.data
        .from("departments")
        .delete()
        .eq("id", dep.id)
        .eq("company_id", activeCompanyId)) as unknown as {
        error: unknown;
      };
      if (res.error !== null && res.error !== undefined) {
        window.alert("Não foi possível excluir o departamento.");
        return;
      }
      await loadAll();
    } catch {
      window.alert("Erro inesperado ao excluir departamento.");
    }
  }

  async function handleAddMember() {
    if (
      drivers === null ||
      activeCompanyId === null ||
      modal?.mode !== "edit" ||
      modal.department === null
    ) {
      return;
    }
    const userId = pendingMemberAdd;
    if (userId === "") return;
    try {
      const res = (await drivers.data.from("department_members").insert({
        company_id: activeCompanyId,
        department_id: modal.department.id,
        user_id: userId,
      })) as unknown as { error: unknown };
      if (res.error !== null && res.error !== undefined) {
        window.alert("Não foi possível adicionar o membro.");
        return;
      }
      setPendingMemberAdd("");
      await Promise.all([loadEditingMembers(modal.department.id), loadAll()]);
    } catch {
      window.alert("Erro inesperado ao adicionar membro.");
    }
  }

  async function handleRemoveMember(memberRowId: string) {
    if (
      drivers === null ||
      activeCompanyId === null ||
      modal?.mode !== "edit" ||
      modal.department === null
    ) {
      return;
    }
    const ok = window.confirm("Remover este membro do departamento?");
    if (!ok) return;
    try {
      const res = (await drivers.data
        .from("department_members")
        .delete()
        .eq("id", memberRowId)
        .eq("company_id", activeCompanyId)) as unknown as {
        error: unknown;
      };
      if (res.error !== null && res.error !== undefined) {
        window.alert("Não foi possível remover o membro.");
        return;
      }
      await Promise.all([loadEditingMembers(modal.department.id), loadAll()]);
    } catch {
      window.alert("Erro inesperado ao remover membro.");
    }
  }

  const totalMembers = useMemo(
    () => Object.values(memberCountByDept).reduce((a, b) => a + b, 0),
    [memberCountByDept],
  );

  const managerCandidates = useMemo(
    () =>
      companyMembers.filter(
        (m) => m.status === "active" && MANAGER_ROLES.has(m.role),
      ),
    [companyMembers],
  );

  const editingMemberIds = useMemo(
    () => new Set(editingMembers.map((m) => m.user_id)),
    [editingMembers],
  );

  const addableMembers = useMemo(
    () =>
      companyMembers.filter(
        (m) => m.status === "active" && !editingMemberIds.has(m.user_id),
      ),
    [companyMembers, editingMemberIds],
  );

  const subtitle = `${departments.length} departamento(s) · ${totalMembers} colaborador(es) alocados`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Building2}
        iconBg="rgba(245,158,11,0.18)"
        iconColor="#fbbf24"
        title="Departamentos"
        subtitle={subtitle}
        right={
          <InlineButton variant="primary" onClick={openCreate}>
            <Plus size={13} strokeWidth={2} />
            Novo departamento
          </InlineButton>
        }
      />

      <div>
        <SectionLabel>Departamentos da empresa</SectionLabel>
        {loading ? (
          <SettingGroup>
            <div
              style={{
                padding: "24px 16px",
                fontSize: 13,
                color: "var(--text-tertiary)",
                textAlign: "center",
              }}
            >
              Carregando…
            </div>
          </SettingGroup>
        ) : departments.length === 0 ? (
          <ComingSoonSection
            icon={Building2}
            label="Nenhum departamento criado"
            description='Use "Novo departamento" para estruturar sua empresa em áreas funcionais.'
          />
        ) : (
          <SettingGroup>
            {departments.map((dep, i) => {
              const count = memberCountByDept[dep.id] ?? 0;
              const sub = `${dep.description ?? "—"} · ${count} membro(s)`;
              return (
                <SettingRow
                  key={dep.id}
                  last={i === departments.length - 1}
                  label={dep.name}
                  sublabel={sub}
                >
                  <InlineButton onClick={() => openEdit(dep)}>
                    <Edit size={12} strokeWidth={2} />
                    Editar
                  </InlineButton>
                  <InlineButton
                    variant="danger"
                    onClick={() => void handleDelete(dep)}
                  >
                    <Trash2 size={12} strokeWidth={2} />
                    Excluir
                  </InlineButton>
                </SettingRow>
              );
            })}
          </SettingGroup>
        )}
      </div>

      {modal !== null && (
        <DepartmentModal
          mode={modal.mode}
          name={draftName}
          description={draftDescription}
          managerUserId={draftManagerUserId}
          onChangeName={setDraftName}
          onChangeDescription={setDraftDescription}
          onChangeManager={setDraftManagerUserId}
          managerCandidates={managerCandidates}
          submitting={submitting}
          onSubmit={() => void handleSubmit()}
          onClose={closeModal}
          editingMembers={editingMembers}
          addableMembers={addableMembers}
          pendingMemberAdd={pendingMemberAdd}
          onChangePendingMember={setPendingMemberAdd}
          onAddMember={() => void handleAddMember()}
          onRemoveMember={(rowId) => void handleRemoveMember(rowId)}
        />
      )}
    </div>
  );
}

interface DepartmentModalProps {
  mode: "create" | "edit";
  name: string;
  description: string;
  managerUserId: string;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangeManager: (v: string) => void;
  managerCandidates: CompanyMember[];
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
  editingMembers: DepartmentMemberWithProfile[];
  addableMembers: CompanyMember[];
  pendingMemberAdd: string;
  onChangePendingMember: (v: string) => void;
  onAddMember: () => void;
  onRemoveMember: (rowId: string) => void;
}

function DepartmentModal({
  mode,
  name,
  description,
  managerUserId,
  onChangeName,
  onChangeDescription,
  onChangeManager,
  managerCandidates,
  submitting,
  onSubmit,
  onClose,
  editingMembers,
  addableMembers,
  pendingMemberAdd,
  onChangePendingMember,
  onAddMember,
  onRemoveMember,
}: DepartmentModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          background: "#191d21",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {mode === "create" ? "Novo departamento" : "Editar departamento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            padding: 20,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="Ex: Financeiro, Comercial, TI…"
              aria-label="Nome do departamento"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Breve descrição (opcional)"
              aria-label="Descrição"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Gestor responsável</label>
            <select
              value={managerUserId}
              onChange={(e) => onChangeManager(e.target.value)}
              aria-label="Gestor"
              style={{
                ...inputStyle,
                cursor: "pointer",
              }}
            >
              <option value="" style={{ background: "#191d21" }}>
                — Sem gestor designado —
              </option>
              {managerCandidates.map((m) => (
                <option
                  key={m.user_id}
                  value={m.user_id}
                  style={{ background: "#191d21" }}
                >
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {mode === "edit" && (
            <div>
              <SectionLabel>Membros</SectionLabel>
              <SettingGroup>
                {editingMembers.length === 0 ? (
                  <div
                    style={{
                      padding: "16px",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      textAlign: "center",
                    }}
                  >
                    Nenhum membro alocado ainda.
                  </div>
                ) : (
                  editingMembers.map((m, i) => (
                    <SettingRow
                      key={m.id}
                      last={i === editingMembers.length - 1}
                      label={m.full_name}
                      sublabel={m.position ?? "—"}
                    >
                      <Badge variant="neutral">Membro</Badge>
                      <InlineButton
                        variant="danger"
                        onClick={() => onRemoveMember(m.id)}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </InlineButton>
                    </SettingRow>
                  ))
                )}
              </SettingGroup>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <select
                  value={pendingMemberAdd}
                  onChange={(e) => onChangePendingMember(e.target.value)}
                  aria-label="Adicionar membro"
                  style={{
                    ...inputStyle,
                    flex: 1,
                    cursor: "pointer",
                  }}
                  disabled={addableMembers.length === 0}
                >
                  <option value="" style={{ background: "#191d21" }}>
                    {addableMembers.length === 0
                      ? "Todos os colaboradores já alocados"
                      : "Selecionar colaborador para adicionar…"}
                  </option>
                  {addableMembers.map((m) => (
                    <option
                      key={m.user_id}
                      value={m.user_id}
                      style={{ background: "#191d21" }}
                    >
                      {m.full_name}{" "}
                      {m.position !== null ? `· ${m.position}` : ""}
                    </option>
                  ))}
                </select>
                <InlineButton
                  variant="primary"
                  onClick={() => {
                    if (pendingMemberAdd === "") return;
                    onAddMember();
                  }}
                >
                  <UserPlus size={12} strokeWidth={2} />
                  Adicionar
                </InlineButton>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "14px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <InlineButton onClick={onClose}>Cancelar</InlineButton>
          <InlineButton variant="primary" onClick={onSubmit}>
            {submitting
              ? "Salvando…"
              : mode === "create"
                ? "Criar departamento"
                : "Salvar alterações"}
          </InlineButton>
        </div>
      </div>
    </div>
  );
}
