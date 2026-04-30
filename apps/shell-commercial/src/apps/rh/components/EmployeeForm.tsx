import { useState } from "react";
import { Loader2, Save, Trash2, X, AlertTriangle } from "lucide-react";
import { CEPInput, type CEPAddress } from "../../../components/shared/CEPInput";
import { PhoneInput } from "../../../components/shared/PhoneInput";
import type { Employee } from "../types";
import {
  CONTRACT_TYPES,
  WORK_REGIMES,
  GENDERS,
  MARITAL_STATUSES,
  STATUS_LABELS,
} from "../types";

type Tab = "pessoal" | "profissional" | "contato" | "endereco" | "trabalhista";

const TABS: { id: Tab; label: string }[] = [
  { id: "pessoal", label: "Pessoal" },
  { id: "profissional", label: "Profissional" },
  { id: "contato", label: "Contato" },
  { id: "endereco", label: "Endereço" },
  { id: "trabalhista", label: "Trabalhista" },
];

interface EmployeeFormProps {
  initial?: Employee | null;
  onSave: (data: Partial<Employee>) => Promise<void>;
  onDelete?: (() => void) | undefined;
  onCancel: () => void;
  saving: boolean;
  deleting: boolean;
}

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  position: string;
  department: string;
  registrationNumber: string;
  contractType: string;
  workSchedule: string;
  salary: string;
  hireDate: string;
  status: string;
  areaTrabalho: string;
  corporateEmail: string;
  corporatePhone: string;
  ramal: string;
  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  costCenter: string;
  pisPasep: string;
  ctpsNumber: string;
  ctpsSeries: string;
  ctpsUf: string;
  voterTitle: string;
  contractStatus: string;
  contractEndDate: string;
  workRegime: string;
  contractTerm: string;
  fgtsAccount: string;
  bio: string;
  linkedin: string;
  hazardPay: boolean;
  dangerPay: boolean;
  nightShiftPay: boolean;
};

function toFormState(emp?: Employee | null): FormState {
  return {
    fullName: emp?.fullName ?? "",
    email: emp?.email ?? "",
    phone: emp?.phone ?? "",
    cpf: emp?.cpf ?? "",
    rg: emp?.rg ?? "",
    birthDate: emp?.birthDate ?? "",
    gender: emp?.gender ?? "",
    maritalStatus: emp?.maritalStatus ?? "",
    nationality: emp?.nationality ?? "Brasileiro(a)",
    position: emp?.position ?? "",
    department: emp?.department ?? "",
    registrationNumber: emp?.registrationNumber ?? "",
    contractType: emp?.contractType ?? "CLT",
    workSchedule: emp?.workSchedule ?? "",
    salary: emp?.salary ?? "",
    hireDate: emp?.hireDate ?? "",
    status: emp?.status ?? "active",
    areaTrabalho: emp?.areaTrabalho ?? "",
    corporateEmail: emp?.corporateEmail ?? "",
    corporatePhone: emp?.corporatePhone ?? "",
    ramal: emp?.ramal ?? "",
    addressCep: emp?.addressCep ?? "",
    addressStreet: emp?.addressStreet ?? "",
    addressNumber: emp?.addressNumber ?? "",
    addressComplement: emp?.addressComplement ?? "",
    addressNeighborhood: emp?.addressNeighborhood ?? "",
    addressCity: emp?.addressCity ?? "",
    addressState: emp?.addressState ?? "",
    costCenter: emp?.costCenter ?? "",
    pisPasep: emp?.pisPasep ?? "",
    ctpsNumber: emp?.ctpsNumber ?? "",
    ctpsSeries: emp?.ctpsSeries ?? "",
    ctpsUf: emp?.ctpsUf ?? "",
    voterTitle: emp?.voterTitle ?? "",
    contractStatus: emp?.contractStatus ?? "",
    contractEndDate: emp?.contractEndDate ?? "",
    workRegime: emp?.workRegime ?? "",
    contractTerm: emp?.contractTerm ?? "",
    fgtsAccount: emp?.fgtsAccount ?? "",
    bio: emp?.bio ?? "",
    linkedin: emp?.linkedin ?? "",
    hazardPay: emp?.hazardPay ?? false,
    dangerPay: emp?.dangerPay ?? false,
    nightShiftPay: emp?.nightShiftPay ?? false,
  };
}

const inputStyle: React.CSSProperties = {
  background: "var(--glass-bg)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "8px 12px",
  width: "100%",
};

const labelCls = "text-xs block mb-1";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  col?: 1 | 2;
}

function Field({ label, children, col = 1 }: FieldProps) {
  return (
    <div className={col === 2 ? "col-span-2" : ""}>
      <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-center gap-2 text-sm cursor-pointer select-none"
      style={{ color: "var(--text-secondary)" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-violet-500"
      />
      {label}
    </label>
  );
}

const handleFocus = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) => {
  e.currentTarget.style.borderColor = "var(--border-focus)";
};
const handleBlur = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) => {
  e.currentTarget.style.borderColor = "var(--border-default)";
};

export function EmployeeForm({
  initial,
  onSave,
  onDelete,
  onCancel,
  saving,
  deleting,
}: EmployeeFormProps) {
  const [tab, setTab] = useState<Tab>("pessoal");
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isLinked = initial?.userId !== null && initial?.userId !== undefined;
  const isEditing = initial !== null && initial !== undefined;

  const set = (key: keyof FormState) => (val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleAddressFound = (addr: CEPAddress) => {
    setForm((prev) => ({
      ...prev,
      addressCep: addr.cep,
      addressStreet: addr.street,
      addressNeighborhood: addr.neighborhood,
      addressCity: addr.city,
      addressState: addr.state,
    }));
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return;
    const payload: Partial<Employee> = {
      fullName: form.fullName,
      email: form.email || null,
      phone: form.phone || null,
      cpf: form.cpf || null,
      rg: form.rg || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      maritalStatus: form.maritalStatus || null,
      nationality: form.nationality || null,
      position: form.position || null,
      department: form.department || null,
      registrationNumber: form.registrationNumber || null,
      contractType: form.contractType,
      workSchedule: form.workSchedule || null,
      salary: form.salary || null,
      hireDate: form.hireDate || null,
      status: form.status,
      areaTrabalho: form.areaTrabalho || null,
      corporateEmail: form.corporateEmail || null,
      corporatePhone: form.corporatePhone || null,
      ramal: form.ramal || null,
      addressCep: form.addressCep || null,
      addressStreet: form.addressStreet || null,
      addressNumber: form.addressNumber || null,
      addressComplement: form.addressComplement || null,
      addressNeighborhood: form.addressNeighborhood || null,
      addressCity: form.addressCity || null,
      addressState: form.addressState || null,
      costCenter: form.costCenter || null,
      pisPasep: form.pisPasep || null,
      ctpsNumber: form.ctpsNumber || null,
      ctpsSeries: form.ctpsSeries || null,
      ctpsUf: form.ctpsUf || null,
      voterTitle: form.voterTitle || null,
      contractStatus: form.contractStatus || null,
      contractEndDate: form.contractEndDate || null,
      workRegime: form.workRegime || null,
      contractTerm: form.contractTerm || null,
      fgtsAccount: form.fgtsAccount || null,
      bio: form.bio || null,
      linkedin: form.linkedin || null,
      hazardPay: form.hazardPay,
      dangerPay: form.dangerPay,
      nightShiftPay: form.nightShiftPay,
    };
    await onSave(payload);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {isEditing ? "Editar colaborador" : "Novo colaborador"}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 rounded"
          style={{
            color: "var(--text-secondary)",
            transition: "var(--transition-default)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--glass-bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab nav */}
      <div
        className="flex shrink-0 px-4 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px"
            style={{
              borderBottomColor: tab === id ? "var(--accent)" : "transparent",
              color:
                tab === id ? "var(--accent-hover)" : "var(--text-secondary)",
              transition: "var(--transition-default)",
            }}
            onMouseEnter={(e) => {
              if (tab !== id)
                e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              if (tab !== id)
                e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "pessoal" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome completo *" col={2}>
              <input
                value={form.fullName}
                onChange={(e) => set("fullName")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                placeholder="Ana Silva"
                aria-label="Nome completo"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="E-mail">
              <input
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                type="email"
                placeholder="ana@empresa.com"
                aria-label="E-mail"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Telefone">
              <PhoneInput
                value={form.phone}
                onChange={(v) => set("phone")(v)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Telefone"
              />
            </Field>
            <Field label="CPF">
              <input
                value={form.cpf}
                onChange={(e) => set("cpf")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                placeholder="000.000.000-00"
                aria-label="CPF"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="RG">
              <input
                value={form.rg}
                onChange={(e) => set("rg")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="RG"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Data de nascimento">
              <input
                value={form.birthDate}
                onChange={(e) => set("birthDate")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                type="date"
                aria-label="Data de nascimento"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Gênero">
              <select
                value={form.gender}
                onChange={(e) => set("gender")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Gênero"
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <option value="">Selecionar</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado civil">
              <select
                value={form.maritalStatus}
                onChange={(e) => set("maritalStatus")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Estado civil"
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <option value="">Selecionar</option>
                {MARITAL_STATUSES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nacionalidade">
              <input
                value={form.nationality}
                onChange={(e) => set("nationality")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Nacionalidade"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Bio" col={2}>
              <textarea
                value={form.bio}
                onChange={(e) => set("bio")(e.target.value)}
                style={{ ...inputStyle, resize: "none" }}
                className="focus:outline-none"
                rows={3}
                aria-label="Bio"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="LinkedIn">
              <input
                value={form.linkedin}
                onChange={(e) => set("linkedin")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                placeholder="https://linkedin.com/in/..."
                aria-label="LinkedIn"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
          </div>
        )}

        {tab === "profissional" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cargo">
              <input
                value={form.position}
                onChange={(e) => set("position")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Cargo"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Departamento">
              <input
                value={form.department}
                onChange={(e) => set("department")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Departamento"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Matrícula">
              <input
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Matrícula"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Centro de custo">
              <input
                value={form.costCenter}
                onChange={(e) => set("costCenter")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Centro de custo"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Área de trabalho">
              <input
                value={form.areaTrabalho}
                onChange={(e) => set("areaTrabalho")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Área de trabalho"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Tipo de contrato">
              <select
                value={form.contractType}
                onChange={(e) => set("contractType")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Tipo de contrato"
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                {CONTRACT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Regime de trabalho">
              <select
                value={form.workRegime}
                onChange={(e) => set("workRegime")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Regime de trabalho"
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <option value="">Selecionar</option>
                {WORK_REGIMES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set("status")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Status"
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data de admissão">
              <input
                value={form.hireDate}
                onChange={(e) => set("hireDate")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                type="date"
                aria-label="Data de admissão"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Salário (R$)">
              <input
                value={form.salary}
                onChange={(e) => set("salary")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                type="number"
                step="0.01"
                aria-label="Salário"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Jornada">
              <input
                value={form.workSchedule}
                onChange={(e) => set("workSchedule")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                placeholder="44h semanais"
                aria-label="Jornada"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
          </div>
        )}

        {tab === "contato" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-mail corporativo" col={2}>
              <input
                value={
                  isLinked
                    ? (initial?.corporateEmail ?? "")
                    : form.corporateEmail
                }
                readOnly={isLinked}
                onChange={(e) => set("corporateEmail")(e.target.value)}
                style={{
                  ...inputStyle,
                  opacity: isLinked ? 0.5 : 1,
                  cursor: isLinked ? "not-allowed" : "text",
                }}
                className="focus:outline-none"
                aria-label="E-mail corporativo"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              {isLinked && (
                <span
                  className="text-xs mt-1 block"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Vinculado ao usuário — somente leitura
                </span>
              )}
            </Field>
            <Field label="Telefone corporativo">
              <PhoneInput
                value={form.corporatePhone}
                onChange={(v) => set("corporatePhone")(v)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Telefone corporativo"
              />
            </Field>
            <Field label="Ramal">
              <input
                value={form.ramal}
                onChange={(e) => set("ramal")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                placeholder="1234"
                aria-label="Ramal"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
          </div>
        )}

        {tab === "endereco" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="CEP">
              <CEPInput
                value={form.addressCep}
                onChange={(v) => set("addressCep")(v)}
                onAddressFound={handleAddressFound}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="CEP"
              />
            </Field>
            <Field label="Número">
              <input
                value={form.addressNumber}
                onChange={(e) => set("addressNumber")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Número"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Rua" col={2}>
              <input
                value={form.addressStreet}
                onChange={(e) => set("addressStreet")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Rua"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Bairro">
              <input
                value={form.addressNeighborhood}
                onChange={(e) => set("addressNeighborhood")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Bairro"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Complemento">
              <input
                value={form.addressComplement}
                onChange={(e) => set("addressComplement")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Complemento"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Cidade">
              <input
                value={form.addressCity}
                onChange={(e) => set("addressCity")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Cidade"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="UF">
              <input
                value={form.addressState}
                onChange={(e) => set("addressState")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                maxLength={2}
                aria-label="UF"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
          </div>
        )}

        {tab === "trabalhista" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="PIS/PASEP">
              <input
                value={form.pisPasep}
                onChange={(e) => set("pisPasep")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="PIS/PASEP"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Conta FGTS">
              <input
                value={form.fgtsAccount}
                onChange={(e) => set("fgtsAccount")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Conta FGTS"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="CTPS número">
              <input
                value={form.ctpsNumber}
                onChange={(e) => set("ctpsNumber")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="CTPS número"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="CTPS série">
              <input
                value={form.ctpsSeries}
                onChange={(e) => set("ctpsSeries")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="CTPS série"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="CTPS UF">
              <input
                value={form.ctpsUf}
                onChange={(e) => set("ctpsUf")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                maxLength={2}
                aria-label="CTPS UF"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Título de eleitor">
              <input
                value={form.voterTitle}
                onChange={(e) => set("voterTitle")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Título de eleitor"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Status do contrato">
              <input
                value={form.contractStatus}
                onChange={(e) => set("contractStatus")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Status do contrato"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Prazo do contrato">
              <input
                value={form.contractTerm}
                onChange={(e) => set("contractTerm")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                aria-label="Prazo do contrato"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Término do contrato">
              <input
                value={form.contractEndDate}
                onChange={(e) => set("contractEndDate")(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
                type="date"
                aria-label="Término do contrato"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Field>
            <Field label="Adicionais" col={2}>
              <div className="flex flex-col gap-2 mt-1">
                <Checkbox
                  label="Adicional de periculosidade"
                  checked={form.hazardPay}
                  onChange={(v) => set("hazardPay")(v)}
                />
                <Checkbox
                  label="Adicional de insalubridade"
                  checked={form.dangerPay}
                  onChange={(v) => set("dangerPay")(v)}
                />
                <Checkbox
                  label="Adicional noturno"
                  checked={form.nightShiftPay}
                  onChange={(v) => set("nightShiftPay")(v)}
                />
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {isEditing && onDelete !== undefined ? (
          showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle size={12} /> Confirmar exclusão?
              </span>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded"
              >
                {deleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Excluir"
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs"
                style={{
                  color: "var(--text-secondary)",
                  transition: "var(--transition-default)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (isLinked) return;
                setShowDeleteConfirm(true);
              }}
              disabled={isLinked}
              title={
                isLinked
                  ? "Funcionário vinculado a usuário não pode ser excluído"
                  : "Excluir"
              }
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} /> Excluir
            </button>
          )
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs"
            style={{
              color: "var(--text-secondary)",
              transition: "var(--transition-default)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !form.fullName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-50 text-white text-xs"
            style={{
              background: "var(--accent)",
              borderRadius: "var(--radius-md)",
              transition: "var(--transition-default)",
            }}
            onMouseEnter={(e) => {
              if (!saving && form.fullName.trim())
                e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--accent)")
            }
            aria-label="Salvar"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
