// HR-only fields from kernel.employees — NO commercial fields (commission, sell, buy, targets)

export interface Employee {
  id: string;
  companyId: string;
  userId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  position: string | null;
  department: string | null;
  registrationNumber: string | null;
  contractType: string;
  workSchedule: string | null;
  salary: string | null;
  hireDate: string | null;
  terminationDate: string | null;
  status: string;
  photoUrl: string | null;
  corporateEmail: string | null;
  corporatePhone: string | null;
  areaTrabalho: string | null;
  ramal: string | null;
  pisPasep: string | null;
  ctpsNumber: string | null;
  ctpsSeries: string | null;
  ctpsUf: string | null;
  voterTitle: string | null;
  addressCep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  costCenter: string | null;
  managerId: string | null;
  contractStatus: string | null;
  contractEndDate: string | null;
  workRegime: string | null;
  contractTerm: string | null;
  fgtsAccount: string | null;
  workLocationSameCompany: boolean;
  hazardPay: boolean;
  dangerPay: boolean;
  nightShiftPay: boolean;
  bio: string | null;
  linkedin: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeStatus = "active" | "inactive" | "pending" | "terminated";

export const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  pending: "Pendente",
  terminated: "Desligado",
};

export const CONTRACT_TYPES = [
  "CLT",
  "PJ",
  "Estágio",
  "Temporário",
  "Aprendiz",
  "Freelance",
];
export const WORK_REGIMES = ["Presencial", "Remoto", "Híbrido"];
export const GENDERS = [
  "Masculino",
  "Feminino",
  "Não-binário",
  "Prefiro não informar",
];
export const MARITAL_STATUSES = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União estável",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToEmployee(row: Record<string, any>): Employee {
  return {
    id: row["id"] as string,
    companyId: row["company_id"] as string,
    userId: (row["user_id"] as string | null) ?? null,
    fullName: row["full_name"] as string,
    email: (row["email"] as string | null) ?? null,
    phone: (row["phone"] as string | null) ?? null,
    cpf: (row["cpf"] as string | null) ?? null,
    rg: (row["rg"] as string | null) ?? null,
    birthDate: (row["birth_date"] as string | null) ?? null,
    gender: (row["gender"] as string | null) ?? null,
    maritalStatus: (row["marital_status"] as string | null) ?? null,
    nationality: (row["nationality"] as string | null) ?? null,
    position: (row["position"] as string | null) ?? null,
    department: (row["department"] as string | null) ?? null,
    registrationNumber: (row["registration_number"] as string | null) ?? null,
    contractType: (row["contract_type"] as string) ?? "CLT",
    workSchedule: (row["work_schedule"] as string | null) ?? null,
    salary: (row["salary"] as string | null) ?? null,
    hireDate: (row["hire_date"] as string | null) ?? null,
    terminationDate: (row["termination_date"] as string | null) ?? null,
    status: (row["status"] as string) ?? "active",
    photoUrl: (row["photo_url"] as string | null) ?? null,
    corporateEmail: (row["corporate_email"] as string | null) ?? null,
    corporatePhone: (row["corporate_phone"] as string | null) ?? null,
    areaTrabalho: (row["area_trabalho"] as string | null) ?? null,
    ramal: (row["ramal"] as string | null) ?? null,
    pisPasep: (row["pis_pasep"] as string | null) ?? null,
    ctpsNumber: (row["ctps_number"] as string | null) ?? null,
    ctpsSeries: (row["ctps_series"] as string | null) ?? null,
    ctpsUf: (row["ctps_uf"] as string | null) ?? null,
    voterTitle: (row["voter_title"] as string | null) ?? null,
    addressCep: (row["address_cep"] as string | null) ?? null,
    addressStreet: (row["address_street"] as string | null) ?? null,
    addressNumber: (row["address_number"] as string | null) ?? null,
    addressComplement: (row["address_complement"] as string | null) ?? null,
    addressNeighborhood: (row["address_neighborhood"] as string | null) ?? null,
    addressCity: (row["address_city"] as string | null) ?? null,
    addressState: (row["address_state"] as string | null) ?? null,
    costCenter: (row["cost_center"] as string | null) ?? null,
    managerId: (row["manager_id"] as string | null) ?? null,
    contractStatus: (row["contract_status"] as string | null) ?? null,
    contractEndDate: (row["contract_end_date"] as string | null) ?? null,
    workRegime: (row["work_regime"] as string | null) ?? null,
    contractTerm: (row["contract_term"] as string | null) ?? null,
    fgtsAccount: (row["fgts_account"] as string | null) ?? null,
    workLocationSameCompany:
      (row["work_location_same_company"] as boolean) ?? true,
    hazardPay: (row["hazard_pay"] as boolean) ?? false,
    dangerPay: (row["danger_pay"] as boolean) ?? false,
    nightShiftPay: (row["night_shift_pay"] as boolean) ?? false,
    bio: (row["bio"] as string | null) ?? null,
    linkedin: (row["linkedin"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}
