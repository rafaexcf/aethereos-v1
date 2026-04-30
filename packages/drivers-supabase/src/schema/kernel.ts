import {
  pgSchema,
  uuid,
  text,
  timestamp,
  jsonb,
  bigserial,
  bigint,
  integer,
  boolean,
  date,
  numeric,
  doublePrecision,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const kernelSchema = pgSchema("kernel");

export const companies = kernelSchema.table(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    plan: text("plan").notNull().default("free"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").notNull().default({}),
    cnpj: text("cnpj"),
    tradeName: text("trade_name"),
    email: text("email"),
    phone: text("phone"),
    logoUrl: text("logo_url"),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
    settings: jsonb("settings").notNull().default({}),
    cnpjData: jsonb("cnpj_data"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("kernel_companies_slug_idx").on(t.slug)],
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export const users = kernelSchema.table(
  "users",
  {
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kernel_users_company_id_idx").on(t.companyId)],
);

export const agents = kernelSchema.table(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    supervisingUserId: uuid("supervising_user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description"),
    capabilities: text("capabilities").array().notNull().default([]),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kernel_agents_company_id_idx").on(t.companyId),
    index("kernel_agents_supervisor_idx").on(t.supervisingUserId),
  ],
);

export const auditLog = kernelSchema.table(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    actorId: uuid("actor_id").notNull(),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: uuid("resource_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kernel_audit_log_company_id_idx").on(t.companyId, t.createdAt),
    index("kernel_audit_log_actor_idx").on(t.actorId, t.createdAt),
  ],
);

export const scpOutbox = kernelSchema.table(
  "scp_outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    eventType: text("event_type").notNull(),
    eventId: uuid("event_id").notNull().unique().defaultRandom(),
    payload: jsonb("payload").notNull(),
    envelope: jsonb("envelope").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [index("kernel_scp_outbox_company_idx").on(t.companyId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Configurações — M44
// ---------------------------------------------------------------------------

export const settings = kernelSchema.table(
  "settings",
  {
    scope: text("scope").notNull(),
    scopeId: uuid("scope_id").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kernel_settings_scope_id_idx").on(t.scope, t.scopeId)],
);

// ---------------------------------------------------------------------------
// Drive — M41
// ---------------------------------------------------------------------------

export const files = kernelSchema.table(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    storagePath: text("storage_path"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kernel_files_company_parent_idx").on(t.companyId, t.parentId),
    index("kernel_files_company_kind_idx").on(t.companyId, t.kind),
    uniqueIndex("kernel_files_unique_name_idx").on(
      t.companyId,
      t.parentId,
      t.name,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Cadastro de Pessoas — M42
// ---------------------------------------------------------------------------

export const people = kernelSchema.table(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    roleLabel: text("role_label"),
    department: text("department"),
    metadata: jsonb("metadata").notNull().default({}),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kernel_people_company_status_idx").on(t.companyId, t.status),
    index("kernel_people_company_dept_idx").on(t.companyId, t.department),
    uniqueIndex("kernel_people_unique_email_idx").on(t.companyId, t.email),
  ],
);

// ---------------------------------------------------------------------------
// Chat — M43
// ---------------------------------------------------------------------------

export const chatChannels = kernelSchema.table(
  "chat_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name"),
    kind: text("kind").notNull().default("channel"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kernel_chat_channels_company_idx").on(t.companyId, t.kind)],
);

export const chatChannelMembers = kernelSchema.table(
  "chat_channel_members",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => chatChannels.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kernel_chat_members_user_idx").on(t.userId)],
);

export const chatMessages = kernelSchema.table(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => chatChannels.id, { onDelete: "cascade" }),
    senderUserId: uuid("sender_user_id").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kernel_chat_messages_channel_idx").on(t.channelId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Copilot — M45
// ---------------------------------------------------------------------------

export const agentCapabilities = kernelSchema.table(
  "agent_capabilities",
  {
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    capability: text("capability").notNull(),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kernel_agent_capabilities_agent_idx").on(t.agentId)],
);

export const copilotConversations = kernelSchema.table(
  "copilot_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title"),
    correlationId: uuid("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kernel_copilot_conversations_company_user_idx").on(
      t.companyId,
      t.userId,
      t.createdAt,
    ),
  ],
);

export const copilotMessages = kernelSchema.table(
  "copilot_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => copilotConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    model: text("model"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    correlationId: uuid("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kernel_copilot_messages_conversation_idx").on(
      t.conversationId,
      t.createdAt,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Shadow Mode — M46
// ---------------------------------------------------------------------------

export const agentProposals = kernelSchema.table(
  "agent_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    conversationId: uuid("conversation_id").references(
      () => copilotConversations.id,
    ),
    supervisingUserId: uuid("supervising_user_id")
      .notNull()
      .references(() => users.id),
    intentType: text("intent_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("pending"),
    correlationId: uuid("correlation_id"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("kernel_agent_proposals_company_status_idx").on(
      t.companyId,
      t.status,
      t.createdAt,
    ),
    index("kernel_agent_proposals_conversation_idx").on(t.conversationId),
  ],
);

export const fileVersions = kernelSchema.table(
  "file_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    storagePath: text("storage_path").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kernel_file_versions_file_idx").on(t.fileId, t.version)],
);

// ---------------------------------------------------------------------------
// Sprint 11 — Multi-tenant schemas
// ---------------------------------------------------------------------------

export const profiles = kernelSchema.table("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  position: text("position"),
  department: text("department"),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  data: jsonb("data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export const tenantMemberships = kernelSchema.table(
  "tenant_memberships",
  {
    userId: uuid("user_id").notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("active"),
    moduleAccess: jsonb("module_access").default({}),
    invitedBy: uuid("invited_by"),
    blockedReason: text("blocked_reason"),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    loginCount: integer("login_count").notNull().default(0),
  },
  (t) => [
    index("kernel_memberships_user_id_idx2").on(t.userId),
    index("kernel_memberships_company_id_idx2").on(t.companyId),
  ],
);

export type TenantMembership = typeof tenantMemberships.$inferSelect;
export type NewTenantMembership = typeof tenantMemberships.$inferInsert;

export const companyModules = kernelSchema.table(
  "company_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    module: text("module").notNull(),
    status: text("status").notNull().default("active"),
    activatedAt: timestamp("activated_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kernel_company_modules_company_idx").on(t.companyId)],
);

export type CompanyModule = typeof companyModules.$inferSelect;
export type NewCompanyModule = typeof companyModules.$inferInsert;

export const employees = kernelSchema.table(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    cpf: text("cpf"),
    rg: text("rg"),
    birthDate: date("birth_date"),
    gender: text("gender"),
    maritalStatus: text("marital_status"),
    nationality: text("nationality"),
    position: text("position"),
    department: text("department"),
    registrationNumber: text("registration_number"),
    contractType: text("contract_type").notNull().default("CLT"),
    workSchedule: text("work_schedule"),
    salary: numeric("salary", { precision: 14, scale: 2 }),
    hireDate: date("hire_date"),
    terminationDate: date("termination_date"),
    status: text("status").notNull().default("active"),
    photoUrl: text("photo_url"),
    coverUrl: text("cover_url"),
    corporateEmail: text("corporate_email"),
    corporatePhone: text("corporate_phone"),
    areaTrabalho: text("area_trabalho"),
    pisPasep: text("pis_pasep"),
    ctpsNumber: text("ctps_number"),
    ctpsSeries: text("ctps_series"),
    ctpsUf: text("ctps_uf"),
    voterTitle: text("voter_title"),
    voterZone: text("voter_zone"),
    voterSection: text("voter_section"),
    addressCep: text("address_cep"),
    addressStreet: text("address_street"),
    addressNumber: text("address_number"),
    addressComplement: text("address_complement"),
    addressNeighborhood: text("address_neighborhood"),
    addressCity: text("address_city"),
    addressState: text("address_state"),
    costCenter: text("cost_center"),
    managerId: uuid("manager_id"),
    workHours: text("work_hours"),
    badgeNumber: text("badge_number"),
    workStartTime: text("work_start_time"),
    workEndTime: text("work_end_time"),
    ramal: text("ramal"),
    linkedin: text("linkedin"),
    bio: text("bio"),
    bloodType: text("blood_type"),
    linkedinPublic: boolean("linkedin_public").notNull().default(false),
    bioPublic: boolean("bio_public").notNull().default(false),
    contractStatus: text("contract_status"),
    contractEndDate: date("contract_end_date"),
    workRegime: text("work_regime"),
    paymentUnit: text("payment_unit"),
    cboCode: text("cbo_code"),
    cboDescription: text("cbo_description"),
    customWorkSchedule: text("custom_work_schedule"),
    contractTerm: text("contract_term"),
    probationPeriod: text("probation_period"),
    probationEndDate: date("probation_end_date"),
    workLocationSameCompany: boolean("work_location_same_company")
      .notNull()
      .default(true),
    workLocationCep: text("work_location_cep"),
    workLocationStreet: text("work_location_street"),
    workLocationNumber: text("work_location_number"),
    workLocationComplement: text("work_location_complement"),
    workLocationNeighborhood: text("work_location_neighborhood"),
    workLocationCity: text("work_location_city"),
    workLocationState: text("work_location_state"),
    lastRaiseDate: date("last_raise_date"),
    hazardPay: boolean("hazard_pay").notNull().default(false),
    hazardPayPercent: numeric("hazard_pay_percent", { precision: 5, scale: 2 }),
    dangerPay: boolean("danger_pay").notNull().default(false),
    nightShiftPay: boolean("night_shift_pay").notNull().default(false),
    overtimePercent: numeric("overtime_percent", { precision: 5, scale: 2 }),
    unionName: text("union_name"),
    fgtsAccount: text("fgts_account"),
    asoAdmissionDate: date("aso_admission_date"),
    asoNextPeriodic: date("aso_next_periodic"),
    terminationReason: text("termination_reason"),
    terminationType: text("termination_type"),
    terminationNotes: text("termination_notes"),
    data: jsonb("data").notNull().default({}),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("kernel_employees_company_id_idx").on(t.companyId),
    index("kernel_employees_status_idx").on(t.companyId, t.status),
  ],
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export const companyAddresses = kernelSchema.table(
  "company_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("sede"),
    zipCode: text("zip_code"),
    street: text("street"),
    number: text("number"),
    complement: text("complement"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    state: text("state"),
    country: text("country").notNull().default("BR"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    isPrimary: boolean("is_primary").notNull().default(false),
    isBilling: boolean("is_billing").notNull().default(false),
    isShipping: boolean("is_shipping").notNull().default(false),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("kernel_company_addresses_company_idx").on(t.companyId)],
);

export type CompanyAddress = typeof companyAddresses.$inferSelect;
export type NewCompanyAddress = typeof companyAddresses.$inferInsert;

export const companyContacts = kernelSchema.table(
  "company_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    department: text("department").notNull(),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    extension: text("extension"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("kernel_company_contacts_company_idx").on(t.companyId)],
);

export type CompanyContact = typeof companyContacts.$inferSelect;
export type NewCompanyContact = typeof companyContacts.$inferInsert;
