import { X, Mail, Phone, Building2, Calendar, Edit2 } from "lucide-react";
import type { Employee } from "../types";
import { STATUS_LABELS } from "../types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface EmployeeDetailDrawerProps {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
}

interface DetailRowProps {
  label: string;
  value: string | null | undefined;
}

function DetailRow({ label, value }: DetailRowProps) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs mb-0.5" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function EmployeeDetailDrawer({
  employee: emp,
  onClose,
  onEdit,
}: EmployeeDetailDrawerProps) {
  return (
    <div
      className="flex flex-col h-full w-80 shrink-0"
      style={{
        borderLeft: "1px solid var(--border-subtle)",
        background: "var(--bg-base)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Detalhes
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1 rounded"
            style={{
              color: "var(--text-secondary)",
              transition: "var(--transition-default)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--glass-bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            aria-label="Editar"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded"
            style={{
              color: "var(--text-secondary)",
              transition: "var(--transition-default)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--glass-bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center gap-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent-hover)",
            }}
          >
            {emp.photoUrl !== null ? (
              <img
                src={emp.photoUrl}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(emp.fullName)
            )}
          </div>
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {emp.fullName}
            </div>
            {emp.position !== null && (
              <div
                className="text-xs mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {emp.position}
              </div>
            )}
            {emp.department !== null && (
              <div
                className="flex items-center justify-center gap-1 text-xs mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                <Building2 size={11} /> {emp.department}
              </div>
            )}
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: emp.status === "active" ? "#10b98122" : "#6b728022",
              color: emp.status === "active" ? "#10b981" : "#9ca3af",
            }}
          >
            {STATUS_LABELS[emp.status] ?? emp.status}
          </span>
        </div>

        {/* Contact */}
        <Section title="Contato">
          {emp.email !== null && (
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <Mail size={13} className="shrink-0" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}
          {emp.phone !== null && (
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <Phone size={13} className="shrink-0" />
              <span>{emp.phone}</span>
            </div>
          )}
        </Section>

        {/* Professional */}
        <Section title="Profissional">
          <DetailRow label="Contrato" value={emp.contractType} />
          <DetailRow label="Regime" value={emp.workRegime} />
          <DetailRow label="Centro de custo" value={emp.costCenter} />
          <DetailRow label="Matrícula" value={emp.registrationNumber} />
          {emp.hireDate !== null && (
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <Calendar size={11} />
              Admissão: {emp.hireDate}
            </div>
          )}
          {emp.salary !== null && (
            <DetailRow
              label="Salário"
              value={`R$ ${parseFloat(emp.salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            />
          )}
        </Section>

        {/* Address */}
        {(emp.addressCity !== null || emp.addressState !== null) && (
          <Section title="Localização">
            {emp.addressStreet !== null && (
              <DetailRow
                label="Endereço"
                value={[
                  emp.addressStreet,
                  emp.addressNumber,
                  emp.addressComplement,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
            {(emp.addressCity !== null || emp.addressState !== null) && (
              <DetailRow
                label="Cidade / UF"
                value={[emp.addressCity, emp.addressState]
                  .filter(Boolean)
                  .join(" / ")}
              />
            )}
            <DetailRow label="CEP" value={emp.addressCep} />
          </Section>
        )}

        {/* Bio */}
        {emp.bio !== null && (
          <Section title="Bio">
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {emp.bio}
            </p>
          </Section>
        )}
      </div>
    </div>
  );
}
