import { useCallback, useState } from "react";
import { useDrivers } from "../../../lib/drivers-context";
import type { Employee } from "../types";

type EmployeeInput = Omit<
  Employee,
  "id" | "companyId" | "userId" | "createdAt" | "updatedAt"
>;

function toDbRow(input: Partial<EmployeeInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.fullName !== undefined) row["full_name"] = input.fullName;
  if (input.email !== undefined) row["email"] = input.email || null;
  if (input.phone !== undefined) row["phone"] = input.phone || null;
  if (input.cpf !== undefined) row["cpf"] = input.cpf || null;
  if (input.rg !== undefined) row["rg"] = input.rg || null;
  if (input.birthDate !== undefined)
    row["birth_date"] = input.birthDate || null;
  if (input.gender !== undefined) row["gender"] = input.gender || null;
  if (input.maritalStatus !== undefined)
    row["marital_status"] = input.maritalStatus || null;
  if (input.nationality !== undefined)
    row["nationality"] = input.nationality || null;
  if (input.position !== undefined) row["position"] = input.position || null;
  if (input.department !== undefined)
    row["department"] = input.department || null;
  if (input.registrationNumber !== undefined)
    row["registration_number"] = input.registrationNumber || null;
  if (input.contractType !== undefined)
    row["contract_type"] = input.contractType;
  if (input.workSchedule !== undefined)
    row["work_schedule"] = input.workSchedule || null;
  if (input.salary !== undefined) row["salary"] = input.salary || null;
  if (input.hireDate !== undefined) row["hire_date"] = input.hireDate || null;
  if (input.status !== undefined) row["status"] = input.status;
  if (input.photoUrl !== undefined) row["photo_url"] = input.photoUrl || null;
  if (input.corporateEmail !== undefined)
    row["corporate_email"] = input.corporateEmail || null;
  if (input.corporatePhone !== undefined)
    row["corporate_phone"] = input.corporatePhone || null;
  if (input.areaTrabalho !== undefined)
    row["area_trabalho"] = input.areaTrabalho || null;
  if (input.ramal !== undefined) row["ramal"] = input.ramal || null;
  if (input.pisPasep !== undefined) row["pis_pasep"] = input.pisPasep || null;
  if (input.ctpsNumber !== undefined)
    row["ctps_number"] = input.ctpsNumber || null;
  if (input.ctpsSeries !== undefined)
    row["ctps_series"] = input.ctpsSeries || null;
  if (input.ctpsUf !== undefined) row["ctps_uf"] = input.ctpsUf || null;
  if (input.voterTitle !== undefined)
    row["voter_title"] = input.voterTitle || null;
  if (input.addressCep !== undefined)
    row["address_cep"] = input.addressCep || null;
  if (input.addressStreet !== undefined)
    row["address_street"] = input.addressStreet || null;
  if (input.addressNumber !== undefined)
    row["address_number"] = input.addressNumber || null;
  if (input.addressComplement !== undefined)
    row["address_complement"] = input.addressComplement || null;
  if (input.addressNeighborhood !== undefined)
    row["address_neighborhood"] = input.addressNeighborhood || null;
  if (input.addressCity !== undefined)
    row["address_city"] = input.addressCity || null;
  if (input.addressState !== undefined)
    row["address_state"] = input.addressState || null;
  if (input.costCenter !== undefined)
    row["cost_center"] = input.costCenter || null;
  if (input.managerId !== undefined)
    row["manager_id"] = input.managerId || null;
  if (input.contractStatus !== undefined)
    row["contract_status"] = input.contractStatus || null;
  if (input.contractEndDate !== undefined)
    row["contract_end_date"] = input.contractEndDate || null;
  if (input.workRegime !== undefined)
    row["work_regime"] = input.workRegime || null;
  if (input.contractTerm !== undefined)
    row["contract_term"] = input.contractTerm || null;
  if (input.fgtsAccount !== undefined)
    row["fgts_account"] = input.fgtsAccount || null;
  if (input.workLocationSameCompany !== undefined)
    row["work_location_same_company"] = input.workLocationSameCompany;
  if (input.hazardPay !== undefined) row["hazard_pay"] = input.hazardPay;
  if (input.dangerPay !== undefined) row["danger_pay"] = input.dangerPay;
  if (input.nightShiftPay !== undefined)
    row["night_shift_pay"] = input.nightShiftPay;
  if (input.bio !== undefined) row["bio"] = input.bio || null;
  if (input.linkedin !== undefined) row["linkedin"] = input.linkedin || null;
  return row;
}

export function useEmployeeMutations() {
  const drivers = useDrivers();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEmployee = useCallback(
    async (input: EmployeeInput): Promise<Employee | null> => {
      if (drivers === null) return null;
      setSaving(true);
      setError(null);
      try {
        const row = toDbRow(input);
        row["status"] = input.status ?? "active";
        row["contract_type"] = input.contractType ?? "CLT";
        const { data, error: err } = await drivers.data
          .from("employees")
          .insert(row)
          .select()
          .single();
        if (err !== null) {
          setError(err.message);
          return null;
        }
        const { rowToEmployee } = await import("../types");
        return rowToEmployee(data as Record<string, unknown>);
      } finally {
        setSaving(false);
      }
    },
    [drivers],
  );

  const updateEmployee = useCallback(
    async (id: string, input: Partial<EmployeeInput>): Promise<boolean> => {
      if (drivers === null) return false;
      setSaving(true);
      setError(null);
      try {
        const row = toDbRow(input);
        const { error: err } = await drivers.data
          .from("employees")
          .update(row)
          .eq("id", id);
        if (err !== null) {
          setError(err.message);
          return false;
        }
        return true;
      } finally {
        setSaving(false);
      }
    },
    [drivers],
  );

  const deleteEmployee = useCallback(
    async (
      employee: Employee,
    ): Promise<{ ok: boolean; blocked: boolean; message?: string }> => {
      if (drivers === null) return { ok: false, blocked: false };
      if (employee.userId !== null) {
        return {
          ok: false,
          blocked: true,
          message: "Funcionário vinculado a usuário não pode ser excluído.",
        };
      }
      setDeleting(true);
      setError(null);
      try {
        const { error: err } = await drivers.data
          .from("employees")
          .delete()
          .eq("id", employee.id);
        if (err !== null) {
          const blocked = err.message.includes("P0001");
          setError(err.message);
          return {
            ok: false,
            blocked,
            message: blocked
              ? "Funcionário vinculado a usuário não pode ser excluído."
              : err.message,
          };
        }
        return { ok: true, blocked: false };
      } finally {
        setDeleting(false);
      }
    },
    [drivers],
  );

  return {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    saving,
    deleting,
    error,
  };
}
