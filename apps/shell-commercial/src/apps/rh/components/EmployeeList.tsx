import {
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Search,
} from "lucide-react";
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

const statusColors: Record<string, string> = {
  active: "#10b981",
  inactive: "#6b7280",
  pending: "#f59e0b",
  terminated: "#ef4444",
};

interface EmployeeListProps {
  employees: Employee[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  search: string;
  statusFilter: string;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onNewEmployee: () => void;
  onSelectEmployee: (emp: Employee) => void;
}

export function EmployeeList({
  employees,
  total,
  page,
  pageSize,
  loading,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onNewEmployee,
  onSelectEmployee,
}: EmployeeListProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          className="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-3 py-1.5"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Search
            size={13}
            className="shrink-0"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar colaborador..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            aria-label="Buscar colaborador"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="outline-none"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            fontSize: 13,
            padding: "6px 12px",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-focus)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-default)")
          }
          aria-label="Filtrar por status"
        >
          <option value="">Todos</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          onClick={onNewEmployee}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white text-sm shrink-0"
          style={{
            background: "var(--accent)",
            borderRadius: "var(--radius-md)",
            transition: "var(--transition-default)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--accent-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--accent)")
          }
          aria-label="Novo colaborador"
        >
          <Plus size={14} />
          Novo
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "var(--text-secondary)" }}
          >
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : employees.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="text-sm">Nenhum colaborador encontrado</span>
            <button
              onClick={onNewEmployee}
              className="text-xs"
              style={{
                color: "var(--accent-hover)",
                transition: "var(--transition-default)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--accent-hover)")
              }
            >
              Adicionar o primeiro colaborador
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th
                  className="text-left py-2 px-4 text-xs font-medium w-12"
                  style={{ color: "var(--text-secondary)" }}
                />
                <th
                  className="text-left py-2 px-4 text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nome
                </th>
                <th
                  className="text-left py-2 px-4 text-xs font-medium hidden md:table-cell"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cargo
                </th>
                <th
                  className="text-left py-2 px-4 text-xs font-medium hidden lg:table-cell"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Departamento
                </th>
                <th
                  className="text-left py-2 px-4 text-xs font-medium hidden xl:table-cell"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Contato
                </th>
                <th
                  className="text-left py-2 px-4 text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp)}
                  className="cursor-pointer"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "var(--transition-default)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--glass-bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td className="py-2 px-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
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
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {emp.fullName}
                    </span>
                    {emp.hireDate !== null && (
                      <span
                        className="text-xs ml-2"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        desde {emp.hireDate}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 hidden md:table-cell">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {emp.position ?? "—"}
                    </span>
                  </td>
                  <td className="py-2 px-4 hidden lg:table-cell">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {emp.department ?? "—"}
                    </span>
                  </td>
                  <td className="py-2 px-4 hidden xl:table-cell">
                    <div className="flex flex-col gap-0.5">
                      {emp.email !== null && (
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <Mail size={10} /> {emp.email}
                        </span>
                      )}
                      {emp.phone !== null && (
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <Phone size={10} /> {emp.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: `${statusColors[emp.status] ?? "#6b7280"}22`,
                        color: statusColors[emp.status] ?? "#6b7280",
                      }}
                    >
                      {STATUS_LABELS[emp.status] ?? emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div
          className="flex items-center justify-between px-4 py-2 shrink-0 text-xs"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <span>{total} colaboradores</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-1 rounded disabled:opacity-30"
              style={{ transition: "var(--transition-default)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--glass-bg-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1 rounded disabled:opacity-30"
              style={{ transition: "var(--transition-default)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--glass-bg-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              aria-label="Próxima página"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
