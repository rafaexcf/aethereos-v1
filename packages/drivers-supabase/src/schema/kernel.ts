import {
  pgSchema,
  uuid,
  text,
  timestamp,
  jsonb,
  bigserial,
  integer,
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
    plan: text("plan").notNull().default("trial"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("kernel_companies_slug_idx").on(t.slug)],
);

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
