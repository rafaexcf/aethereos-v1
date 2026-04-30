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

const STATUS_COLORS: Record<PersonStatus, string> = {
  active: "text-green-400 bg-green-900/30",
  inactive: "text-zinc-400 bg-zinc-800",
  onboarding: "text-yellow-400 bg-yellow-900/30",
};

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
          <span className="text-xs text-zinc-500">Nome completo *</span>
          <input
            type="text"
            {...field("fullName")}
            placeholder="João Silva"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">E-mail</span>
          <input
            type="email"
            {...field("email")}
            placeholder="joao@empresa.com"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Telefone</span>
          <input
            type="tel"
            {...field("phone")}
            placeholder="(11) 99999-9999"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Cargo</span>
          <input
            type="text"
            {...field("roleLabel")}
            placeholder="Analista de Dados"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Departamento</span>
          <input
            type="text"
            {...field("department")}
            placeholder="Tecnologia"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Status</span>
          <select
            {...field("status")}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
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
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={form.fullName.trim().length === 0}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
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
        <h3 className="text-sm font-semibold text-zinc-100">
          Desativar {person.fullName}?
        </h3>
        <p className="text-xs text-zinc-400">
          Esta ação desativa o colaborador mas não o exclui permanentemente. O
          acesso ao sistema será revogado.
        </p>
        <div className="mt-2 rounded-md border border-yellow-600/40 bg-yellow-900/20 p-3">
          <p className="text-xs text-yellow-300">
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
        <span className="text-xs text-zinc-300">
          Confirmo que desejo desativar{" "}
          <strong className="text-zinc-100">{person.fullName}</strong>
        </span>
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
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
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">Todos os depto.</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="flex rounded-md border border-zinc-700 overflow-hidden">
            {(
              ["all", "active", "onboarding", "inactive"] as FilterStatus[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={[
                  "px-2 py-1 text-xs transition-colors",
                  filterStatus === s
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200",
                ].join(" ")}
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
            className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            + Cadastrar
          </button>
        </div>
      }
    >
      {/* Painel de detalhe/edição/form */}
      {(showForm || editingPerson !== null || deactivating !== null) && (
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/50">
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
        <div className="shrink-0 border-b border-red-900/40 bg-red-950/20 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Lista de pessoas */}
      <div className="flex flex-1 flex-col overflow-y-auto divide-y divide-zinc-800">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
            {drivers === null || activeCompanyId === null
              ? "Aguardando sessão…"
              : "Nenhuma pessoa encontrada"}
          </div>
        ) : (
          filtered.map((person) => (
            <div
              key={person.id}
              className={[
                "group flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 cursor-pointer",
                selectedPerson?.id === person.id ? "bg-zinc-900" : "",
              ].join(" ")}
              onClick={() =>
                setSelectedPerson((prev) =>
                  prev?.id === person.id ? null : person,
                )
              }
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-700/30 text-sm font-medium text-violet-300">
                {initials(person.fullName)}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                <span className="truncate text-sm font-medium text-zinc-100">
                  {person.fullName}
                </span>
                <span className="truncate text-xs text-zinc-500">
                  {[person.roleLabel, person.department]
                    .filter(Boolean)
                    .join(" · ")}
                  {person.email !== undefined && (
                    <span className="ml-1 text-zinc-600">· {person.email}</span>
                  )}
                </span>
              </div>

              {/* Status badge */}
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-xs",
                  STATUS_COLORS[person.status],
                ].join(" ")}
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
                  className="rounded p-1 text-xs text-zinc-500 hover:text-zinc-300"
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
                    className="rounded p-1 text-xs text-zinc-500 hover:text-red-400"
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
