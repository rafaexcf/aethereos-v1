import { useState, useCallback } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useEmployees, useDepartments } from "./hooks/useEmployees";
import { useEmployeeMutations } from "./hooks/useEmployeeMutations";
import { EmployeeList } from "./components/EmployeeList";
import { EmployeeForm } from "./components/EmployeeForm";
import { EmployeeDetailDrawer } from "./components/EmployeeDetailDrawer";
import type { Employee } from "./types";
import { rowToEmployee } from "./types";

type View = "list" | "form" | "new";

export function RHApp() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<View>("list");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { employees, total, page, setPage, loading, refresh, pageSize } =
    useEmployees({
      search,
      status: statusFilter || undefined,
    });
  useDepartments(); // pre-load departments (used in future filter)

  const { createEmployee, updateEmployee, deleteEmployee, saving, deleting } =
    useEmployeeMutations();

  const handleNewEmployee = useCallback(() => {
    setEditingEmployee(null);
    setSelectedEmployee(null);
    setView("new");
  }, []);

  const handleSelectEmployee = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
    setView("list");
  }, []);

  const handleEditEmployee = useCallback(() => {
    if (selectedEmployee === null) return;
    setEditingEmployee(selectedEmployee);
    setView("form");
  }, [selectedEmployee]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedEmployee(null);
  }, []);

  const handleSave = useCallback(
    async (data: Partial<Employee>) => {
      if (editingEmployee !== null) {
        const ok = await updateEmployee(editingEmployee.id, data);
        if (ok) {
          await refresh();
          // Update selected employee data
          setSelectedEmployee((prev) =>
            prev !== null ? { ...prev, ...data } : null,
          );
          setView("list");
        }
      } else {
        const created = await createEmployee(
          data as Omit<
            Employee,
            "id" | "companyId" | "userId" | "createdAt" | "updatedAt"
          >,
        );
        if (created !== null) {
          await refresh();
          setSelectedEmployee(
            rowToEmployee(created as unknown as Record<string, unknown>),
          );
          setView("list");
        }
      }
    },
    [editingEmployee, createEmployee, updateEmployee, refresh],
  );

  const handleDelete = useCallback(async () => {
    if (editingEmployee === null) return;
    const result = await deleteEmployee(editingEmployee);
    if (result.ok) {
      await refresh();
      setSelectedEmployee(null);
      setEditingEmployee(null);
      setView("list");
    }
  }, [editingEmployee, deleteEmployee, refresh]);

  const handleCancelForm = useCallback(() => {
    setView("list");
    setEditingEmployee(null);
  }, []);

  const isFormOpen = view === "form" || view === "new";

  return (
    <AppShell title="RH" subtitle="Colaboradores internos">
      <div className="flex h-full overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {isFormOpen ? (
            <EmployeeForm
              initial={editingEmployee}
              onSave={handleSave}
              onDelete={
                editingEmployee !== null
                  ? () => {
                      void handleDelete();
                    }
                  : undefined
              }
              onCancel={handleCancelForm}
              saving={saving}
              deleting={deleting}
            />
          ) : (
            <EmployeeList
              employees={employees}
              total={total}
              page={page}
              pageSize={pageSize}
              loading={loading}
              search={search}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              onPageChange={setPage}
              onNewEmployee={handleNewEmployee}
              onSelectEmployee={handleSelectEmployee}
            />
          )}
        </div>

        {/* Detail drawer */}
        {selectedEmployee !== null && !isFormOpen && (
          <EmployeeDetailDrawer
            employee={selectedEmployee}
            onClose={handleCloseDrawer}
            onEdit={handleEditEmployee}
          />
        )}
      </div>
    </AppShell>
  );
}
