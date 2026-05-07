// Sprint 28 (MX152): Grupos transversais — CRUD real via drivers.data com RLS
// por company_id. Diferentemente de Departamentos, não tem manager e um
// usuário pode estar em N grupos (group_members é junction N:N).

import { useEffect, useMemo, useState } from "react";
import { UserCheck, Plus, X, Edit, Trash2, UserPlus } from "lucide-react";
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

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
}

interface GroupMemberRow {
  id: string;
  user_id: string;
}

interface GroupMemberWithProfile extends GroupMemberRow {
  full_name: string;
  position: string | null;
}

interface MembershipProfileRow {
  user_id: string;
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
  status: string;
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
  group: GroupRow | null;
}

export function TabGrupos() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [memberCountByGroup, setMemberCountByGroup] = useState<
    Record<string, number>
  >({});
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingMembers, setEditingMembers] = useState<
    GroupMemberWithProfile[]
  >([]);
  const [pendingMemberAdd, setPendingMemberAdd] = useState<string>("");

  async function loadAll() {
    if (drivers === null || activeCompanyId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [groupsRes, memsRes, profsRes] = await Promise.all([
        drivers.data
          .from("groups")
          .select("id,name,description")
          .eq("company_id", activeCompanyId)
          .order("name") as unknown as Promise<{
          data: GroupRow[] | null;
          error: unknown;
        }>,
        drivers.data
          .from("group_members")
          .select("id,group_id,user_id")
          .eq("company_id", activeCompanyId) as unknown as Promise<{
          data: { id: string; group_id: string; user_id: string }[] | null;
          error: unknown;
        }>,
        drivers.data
          .from("tenant_memberships")
          .select("user_id,status,profiles!inner(full_name,position)")
          .eq("company_id", activeCompanyId) as unknown as Promise<{
          data: MembershipProfileRow[] | null;
          error: unknown;
        }>,
      ]);

      const grps = groupsRes.data ?? [];
      const mems = memsRes.data ?? [];
      const profs = profsRes.data ?? [];

      const counts: Record<string, number> = {};
      for (const m of mems) {
        counts[m.group_id] = (counts[m.group_id] ?? 0) + 1;
      }

      const members: CompanyMember[] = profs.map((p) => ({
        user_id: p.user_id,
        full_name: p.profiles?.full_name ?? "Sem nome",
        position: p.profiles?.position ?? null,
        status: p.status,
      }));

      setGroups(grps);
      setMemberCountByGroup(counts);
      setCompanyMembers(members);
    } catch {
      setGroups([]);
      setMemberCountByGroup({});
      setCompanyMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [drivers, activeCompanyId]);

  async function loadEditingMembers(groupId: string) {
    if (drivers === null || activeCompanyId === null) {
      setEditingMembers([]);
      return;
    }
    try {
      const res = (await drivers.data
        .from("group_members")
        .select("id,user_id,profiles!inner(full_name,position)")
        .eq("company_id", activeCompanyId)
        .eq("group_id", groupId)) as unknown as {
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
    setModal({ mode: "create", group: null });
    setDraftName("");
    setDraftDescription("");
    setEditingMembers([]);
    setPendingMemberAdd("");
  }

  function openEdit(grp: GroupRow) {
    setModal({ mode: "edit", group: grp });
    setDraftName(grp.name);
    setDraftDescription(grp.description ?? "");
    setPendingMemberAdd("");
    void loadEditingMembers(grp.id);
  }

  function closeModal() {
    setModal(null);
  }

  async function handleSubmit() {
    if (drivers === null || activeCompanyId === null) return;
    const name = draftName.trim();
    if (name === "") {
      window.alert("Informe um nome para o grupo.");
      return;
    }
    setSubmitting(true);
    try {
      const description = draftDescription.trim() || null;
      if (modal?.mode === "create") {
        const res = (await drivers.data.from("groups").insert({
          company_id: activeCompanyId,
          name,
          description,
        })) as unknown as { error: unknown };
        if (res.error !== null && res.error !== undefined) {
          window.alert("Não foi possível criar o grupo.");
          return;
        }
      } else if (modal?.mode === "edit" && modal.group !== null) {
        const res = (await drivers.data
          .from("groups")
          .update({ name, description })
          .eq("id", modal.group.id)
          .eq("company_id", activeCompanyId)) as unknown as {
          error: unknown;
        };
        if (res.error !== null && res.error !== undefined) {
          window.alert("Não foi possível salvar o grupo.");
          return;
        }
      }
      await loadAll();
      closeModal();
    } catch {
      window.alert("Erro inesperado ao salvar grupo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(grp: GroupRow) {
    if (drivers === null || activeCompanyId === null) return;
    const ok = window.confirm(
      `Excluir o grupo "${grp.name}"?\n\nIsso removerá todos os vínculos de membros associados.`,
    );
    if (!ok) return;
    try {
      const res = (await drivers.data
        .from("groups")
        .delete()
        .eq("id", grp.id)
        .eq("company_id", activeCompanyId)) as unknown as {
        error: unknown;
      };
      if (res.error !== null && res.error !== undefined) {
        window.alert("Não foi possível excluir o grupo.");
        return;
      }
      await loadAll();
    } catch {
      window.alert("Erro inesperado ao excluir grupo.");
    }
  }

  async function handleAddMember() {
    if (
      drivers === null ||
      activeCompanyId === null ||
      modal?.mode !== "edit" ||
      modal.group === null
    ) {
      return;
    }
    const userId = pendingMemberAdd;
    if (userId === "") return;
    try {
      const res = (await drivers.data.from("group_members").insert({
        company_id: activeCompanyId,
        group_id: modal.group.id,
        user_id: userId,
      })) as unknown as { error: unknown };
      if (res.error !== null && res.error !== undefined) {
        window.alert("Não foi possível adicionar o membro.");
        return;
      }
      setPendingMemberAdd("");
      await Promise.all([loadEditingMembers(modal.group.id), loadAll()]);
    } catch {
      window.alert("Erro inesperado ao adicionar membro.");
    }
  }

  async function handleRemoveMember(memberRowId: string) {
    if (
      drivers === null ||
      activeCompanyId === null ||
      modal?.mode !== "edit" ||
      modal.group === null
    ) {
      return;
    }
    const ok = window.confirm("Remover este membro do grupo?");
    if (!ok) return;
    try {
      const res = (await drivers.data
        .from("group_members")
        .delete()
        .eq("id", memberRowId)
        .eq("company_id", activeCompanyId)) as unknown as {
        error: unknown;
      };
      if (res.error !== null && res.error !== undefined) {
        window.alert("Não foi possível remover o membro.");
        return;
      }
      await Promise.all([loadEditingMembers(modal.group.id), loadAll()]);
    } catch {
      window.alert("Erro inesperado ao remover membro.");
    }
  }

  const totalMembers = useMemo(
    () => Object.values(memberCountByGroup).reduce((a, b) => a + b, 0),
    [memberCountByGroup],
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

  const subtitle = `${groups.length} grupo(s) · ${totalMembers} colaborador(es) alocados`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={UserCheck}
        iconBg="rgba(236,72,153,0.18)"
        iconColor="#f472b6"
        title="Grupos transversais"
        subtitle={subtitle}
        right={
          <InlineButton variant="primary" onClick={openCreate}>
            <Plus size={13} strokeWidth={2} />
            Novo grupo
          </InlineButton>
        }
      />

      <div>
        <SectionLabel>Grupos da empresa</SectionLabel>
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
        ) : groups.length === 0 ? (
          <ComingSoonSection
            icon={UserCheck}
            label="Nenhum grupo criado"
            description='Use "Novo grupo" para criar comitês, squads ou times transversais.'
          />
        ) : (
          <SettingGroup>
            {groups.map((grp, i) => {
              const count = memberCountByGroup[grp.id] ?? 0;
              const sub = `${grp.description ?? "—"} · ${count} membro(s)`;
              return (
                <SettingRow
                  key={grp.id}
                  last={i === groups.length - 1}
                  label={grp.name}
                  sublabel={sub}
                >
                  <InlineButton onClick={() => openEdit(grp)}>
                    <Edit size={12} strokeWidth={2} />
                    Editar
                  </InlineButton>
                  <InlineButton
                    variant="danger"
                    onClick={() => void handleDelete(grp)}
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
        <GroupModal
          mode={modal.mode}
          name={draftName}
          description={draftDescription}
          onChangeName={setDraftName}
          onChangeDescription={setDraftDescription}
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

interface GroupModalProps {
  mode: "create" | "edit";
  name: string;
  description: string;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
  editingMembers: GroupMemberWithProfile[];
  addableMembers: CompanyMember[];
  pendingMemberAdd: string;
  onChangePendingMember: (v: string) => void;
  onAddMember: () => void;
  onRemoveMember: (rowId: string) => void;
}

function GroupModal({
  mode,
  name,
  description,
  onChangeName,
  onChangeDescription,
  submitting,
  onSubmit,
  onClose,
  editingMembers,
  addableMembers,
  pendingMemberAdd,
  onChangePendingMember,
  onAddMember,
  onRemoveMember,
}: GroupModalProps) {
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
            {mode === "create" ? "Novo grupo" : "Editar grupo"}
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
              placeholder="Ex: Comitê de Inovação, Squad NF-e…"
              aria-label="Nome do grupo"
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
                      ? "Todos os colaboradores já neste grupo"
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
                ? "Criar grupo"
                : "Salvar alterações"}
          </InlineButton>
        </div>
      </div>
    </div>
  );
}
