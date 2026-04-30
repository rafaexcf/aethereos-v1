import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useSessionStore } from "../../stores/session";
import { useDrivers } from "../../lib/drivers-context";

// ---------------------------------------------------------------------------
// Tipos de domínio (espelham kernel.people)
// ---------------------------------------------------------------------------

type PersonStatus = "active" | "inactive" | "onboarding";

interface Person {
  id: string;
  companyId: string;
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleLabel?: string;
  department?: string;
  status: PersonStatus;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<PersonStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  onboarding: "Onboarding",
};

function statusBadgeStyle(status: PersonStatus): React.CSSProperties {
  if (status === "active")
    return { background: "rgba(16,185,129,0.14)", color: "#34d399" };
  if (status === "onboarding")
    return { background: "rgba(251,191,36,0.14)", color: "#fbbf24" };
  return { background: "var(--glass-bg)", color: "var(--text-tertiary)" };
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function mapRow(row: Record<string, unknown>): Person {
  const person: Person = {
    id: row["id"] as string,
    companyId: row["company_id"] as string,
    fullName: row["full_name"] as string,
    status: row["status"] as PersonStatus,
    createdAt: new Date(row["created_at"] as string),
  };
  const uid = row["user_id"];
  if (typeof uid === "string") person.userId = uid;
  const email = row["email"];
  if (typeof email === "string") person.email = email;
  const phone = row["phone"];
  if (typeof phone === "string") person.phone = phone;
  const role = row["role_label"];
  if (typeof role === "string") person.roleLabel = role;
  const dept = row["department"];
  if (typeof dept === "string") person.department = dept;
  return person;
}

// ---------------------------------------------------------------------------
// Formulário de criação/edição
// ---------------------------------------------------------------------------

interface PersonFormData {
  fullName: string;
  email: string;
  phone: string;
  roleLabel: string;
  department: string;
  status: PersonStatus;
}

const emptyForm: PersonFormData = {
  fullName: "",
  email: "",
  phone: "",
  roleLabel: "",
  department: "",
  status: "active",
};

interface PersonFormProps {
  initial?: PersonFormData;
  onSave: (data: PersonFormData) => void;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
  background: "var(--glass-bg)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "6px 12px",
};

function PersonForm({
  initial = emptyForm,
  onSave,
  onCancel,
}: PersonFormProps) {
  const [form, setForm] = useState<PersonFormData>(initial);

  function field(key: keyof PersonFormData) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Nome completo *
          </span>
          <input
            type="text"
            {...field("fullName")}
            placeholder="João Silva"
            className="focus:outline-none"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            E-mail
          </span>
          <input
            type="email"
            {...field("email")}
            placeholder="joao@empresa.com"
            className="focus:outline-none"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Telefone
          </span>
          <input
            type="tel"
            {...field("phone")}
            placeholder="(11) 99999-9999"
            className="focus:outline-none"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Cargo
          </span>
          <input
            type="text"
            {...field("roleLabel")}
            placeholder="Analista de Dados"
            className="focus:outline-none"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Departamento
          </span>
          <input
            type="text"
            {...field("department")}
            placeholder="Tecnologia"
            className="focus:outline-none"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Status
          </span>
          <select
            {...field("status")}
            className="focus:outline-none"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          >
            <option value="active">Ativo</option>
            <option value="onboarding">Onboarding</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs"
          style={{
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            transition: "var(--transition-fast)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-default)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-subtle)")
          }
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={form.fullName.trim().length === 0}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          style={{
            background: "var(--accent)",
            transition: "var(--transition-fast)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--accent-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--accent)")
          }
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diálogo de confirmação dupla para desativação
// ---------------------------------------------------------------------------

interface DeactivateDialogProps {
  person: Person;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeactivateDialog({
  person,
  onConfirm,
  onCancel,
}: DeactivateDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Desativar {person.fullName}?
        </h3>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Esta ação desativa o colaborador mas não o exclui permanentemente. O
          acesso ao sistema será revogado.
        </p>
        <div
          className="mt-2 rounded-md p-3"
          style={{
            border: "1px solid rgba(251,191,36,0.25)",
            background: "rgba(251,191,36,0.08)",
          }}
        >
          <p className="text-xs" style={{ color: "#fbbf24" }}>
            ⚠️ Operação sensível — exige confirmação dupla.
            Demissão/desligamento é listado nas operações invariantes (12.4) que
            agentes nunca executam automaticamente.
          </p>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-4 w-4 accent-red-500"
        />
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Confirmo que desejo desativar{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {person.fullName}
          </strong>
        </span>
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs"
          style={{
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            transition: "var(--transition-fast)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-default)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-subtle)")
          }
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!confirmed}
          className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-40"
        >
          Desativar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PessoasApp principal
// ---------------------------------------------------------------------------

type FilterStatus = "all" | PersonStatus;

export function PessoasApp() {
  const { activeCompanyId, userId } = useSessionStore();
  const drivers = useDrivers();

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDept, setFilterDept] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deactivating, setDeactivating] = useState<Person | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Carrega pessoas do Supabase
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    setLoading(true);
    setError(null);

    drivers.data
      .from("people")
      .select(
        "id,company_id,user_id,full_name,email,phone,role_label,department,status,created_at",
      )
      .order("full_name")
      .then(({ data, error: dbErr }) => {
        setLoading(false);
        if (dbErr !== null) {
          setError(dbErr.message);
          return;
        }
        setPeople(
          (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
        );
      });
  }, [drivers, activeCompanyId]);

  const departments = [
    ...new Set(people.map((p) => p.department).filter(Boolean)),
  ] as string[];

  const filtered = people.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterDept.length > 0 && p.department !== filterDept) return false;
    return true;
  });

  const handleCreate = useCallback(
    async (data: PersonFormData) => {
      if (drivers === null || activeCompanyId === null) return;

      const payload: Record<string, unknown> = {
        full_name: data.fullName,
        status: data.status,
      };
      if (data.email.length > 0) payload["email"] = data.email;
      if (data.phone.length > 0) payload["phone"] = data.phone;
      if (data.roleLabel.length > 0) payload["role_label"] = data.roleLabel;
      if (data.department.length > 0) payload["department"] = data.department;

      const { data: inserted, error: dbErr } = await drivers.data
        .from("people")
        .insert(payload)
        .select(
          "id,company_id,user_id,full_name,email,phone,role_label,department,status,created_at",
        )
        .single();

      if (dbErr !== null) {
        setError(`Erro ao cadastrar: ${dbErr.message}`);
        return;
      }

      if (inserted !== null) {
        const person = mapRow(inserted as Record<string, unknown>);
        setPeople((prev) => [...prev, person]);
        if (userId !== null) {
          void drivers.scp.publishEvent("platform.person.created", {
            person_id: person.id,
            company_id: activeCompanyId,
            full_name: data.fullName,
            email: data.email.length > 0 ? data.email : undefined,
            created_by: userId,
          });
        }
      }
      setShowForm(false);
    },
    [drivers, activeCompanyId, userId],
  );

  const handleUpdate = useCallback(
    async (data: PersonFormData) => {
      if (editingPerson === null || drivers === null) return;

      const payload: Record<string, unknown> = {
        full_name: data.fullName,
        status: data.status,
        email: data.email.length > 0 ? data.email : null,
        phone: data.phone.length > 0 ? data.phone : null,
        role_label: data.roleLabel.length > 0 ? data.roleLabel : null,
        department: data.department.length > 0 ? data.department : null,
      };

      const { data: updated, error: dbErr } = await drivers.data
        .from("people")
        .update(payload)
        .eq("id", editingPerson.id)
        .select(
          "id,company_id,user_id,full_name,email,phone,role_label,department,status,created_at",
        )
        .single();

      if (dbErr !== null) {
        setError(`Erro ao atualizar: ${dbErr.message}`);
        return;
      }

      if (updated !== null) {
        const updatedPerson = mapRow(updated as Record<string, unknown>);
        setPeople((prev) =>
          prev.map((p) => (p.id === editingPerson.id ? updatedPerson : p)),
        );
        if (activeCompanyId !== null && userId !== null) {
          void drivers.scp.publishEvent("platform.person.updated", {
            person_id: editingPerson.id,
            company_id: activeCompanyId,
            fields_changed: Object.keys(payload),
            updated_by: userId,
          });
        }
      }
      setEditingPerson(null);
    },
    [editingPerson, drivers, activeCompanyId, userId],
  );

  const confirmDeactivate = useCallback(async () => {
    if (deactivating === null || drivers === null) return;

    const { data: updated, error: dbErr } = await drivers.data
      .from("people")
      .update({ status: "inactive" })
      .eq("id", deactivating.id)
      .select(
        "id,company_id,user_id,full_name,email,phone,role_label,department,status,created_at",
      )
      .single();

    if (dbErr !== null) {
      setError(`Erro ao desativar: ${dbErr.message}`);
      setDeactivating(null);
      return;
    }

    if (updated !== null) {
      const updatedPerson = mapRow(updated as Record<string, unknown>);
      setPeople((prev) =>
        prev.map((p) => (p.id === deactivating.id ? updatedPerson : p)),
      );
      if (selectedPerson?.id === deactivating.id) {
        setSelectedPerson(updatedPerson);
      }
      if (activeCompanyId !== null && userId !== null) {
        void drivers.scp.publishEvent("platform.person.deactivated", {
          person_id: deactivating.id,
          company_id: activeCompanyId,
          full_name: deactivating.fullName,
          deactivated_by: userId,
          approval_token: crypto.randomUUID(),
        });
      }
    }
    setDeactivating(null);
  }, [deactivating, drivers, selectedPerson, activeCompanyId, userId]);

  const totalActive = people.filter((p) => p.status === "active").length;

  return (
    <AppShell
      title="Pessoas"
      subtitle={`${totalActive} ativo(s) de ${people.length} cadastrado(s)`}
      actions={
        <div className="flex items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="focus:outline-none"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "4px 8px",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          >
            <option value="">Todos os depto.</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div
            className="flex overflow-hidden"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {(
              ["all", "active", "onboarding", "inactive"] as FilterStatus[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className="px-2 py-1 text-xs"
                style={{
                  background:
                    filterStatus === s ? "var(--accent)" : "transparent",
                  color: filterStatus === s ? "white" : "var(--text-tertiary)",
                  transition: "var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  if (filterStatus !== s)
                    e.currentTarget.style.background = "var(--glass-bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (filterStatus !== s)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                {s === "all" ? "Todos" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPerson(null);
              setShowForm(true);
            }}
            disabled={drivers === null || activeCompanyId === null}
            className="rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
            style={{
              background: "var(--accent)",
              transition: "var(--transition-fast)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--accent-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--accent)")
            }
          >
            + Cadastrar
          </button>
        </div>
      }
    >
      {/* Painel de detalhe/edição/form */}
      {(showForm || editingPerson !== null || deactivating !== null) && (
        <div
          className="shrink-0 border-b"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--glass-bg)",
          }}
        >
          {deactivating !== null ? (
            <DeactivateDialog
              person={deactivating}
              onConfirm={() => void confirmDeactivate()}
              onCancel={() => setDeactivating(null)}
            />
          ) : (
            <PersonForm
              initial={
                editingPerson !== null
                  ? {
                      fullName: editingPerson.fullName,
                      email: editingPerson.email ?? "",
                      phone: editingPerson.phone ?? "",
                      roleLabel: editingPerson.roleLabel ?? "",
                      department: editingPerson.department ?? "",
                      status: editingPerson.status,
                    }
                  : emptyForm
              }
              onSave={
                editingPerson !== null
                  ? (d) => void handleUpdate(d)
                  : (d) => void handleCreate(d)
              }
              onCancel={() => {
                setShowForm(false);
                setEditingPerson(null);
              }}
            />
          )}
        </div>
      )}

      {/* Erro */}
      {error !== null && (
        <div
          className="shrink-0 border-b px-4 py-2 text-xs"
          style={{
            borderColor: "rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.08)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      {/* Lista de pessoas */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {loading ? (
          <div
            className="flex flex-1 items-center justify-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-1 items-center justify-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            {drivers === null || activeCompanyId === null
              ? "Aguardando sessão…"
              : "Nenhuma pessoa encontrada"}
          </div>
        ) : (
          filtered.map((person) => (
            <div
              key={person.id}
              className="group flex items-center gap-3 px-4 py-3 cursor-pointer"
              style={{
                background:
                  selectedPerson?.id === person.id
                    ? "var(--glass-bg-hover)"
                    : "transparent",
                borderBottom: "1px solid var(--border-subtle)",
                transition: "var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                if (selectedPerson?.id !== person.id)
                  e.currentTarget.style.background = "var(--glass-bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (selectedPerson?.id !== person.id)
                  e.currentTarget.style.background = "transparent";
              }}
              onClick={() =>
                setSelectedPerson((prev) =>
                  prev?.id === person.id ? null : person,
                )
              }
            >
              {/* Avatar */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                style={{
                  background: "rgba(99,102,241,0.18)",
                  color: "var(--accent-hover)",
                }}
              >
                {initials(person.fullName)}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                <span
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {person.fullName}
                </span>
                <span
                  className="truncate text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {[person.roleLabel, person.department]
                    .filter(Boolean)
                    .join(" · ")}
                  {person.email !== undefined && (
                    <span
                      className="ml-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      · {person.email}
                    </span>
                  )}
                </span>
              </div>

              {/* Status badge */}
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                style={statusBadgeStyle(person.status)}
              >
                {STATUS_LABELS[person.status]}
              </span>

              {/* Ações — visíveis no hover */}
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPerson(person);
                    setShowForm(false);
                  }}
                  className="rounded p-1 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-tertiary)")
                  }
                  title="Editar"
                >
                  ✏️
                </button>
                {person.status !== "inactive" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeactivating(person);
                    }}
                    className="rounded p-1 text-xs hover:text-red-400"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#f87171")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-tertiary)")
                    }
                    title="Desativar"
                  >
                    🚫
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
