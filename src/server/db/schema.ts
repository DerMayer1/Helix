import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "physician", "staff"]);

export const appointmentStatus = pgEnum("appointment_status", [
  "booked",
  "confirmed",
  "completed",
  "cancelled",
  "no_show"
]);

export const recoveryStatus = pgEnum("recovery_status", [
  "not_started",
  "in_progress",
  "succeeded",
  "failed"
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  role: userRole("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  displayName: text("display_name").notNull(),
  contactPreference: text("contact_preference").notNull().default("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  reminderSchedule: jsonb("reminder_schedule").notNull(),
  recoveryBehavior: jsonb("recovery_behavior").notNull(),
  postCareSequence: jsonb("post_care_sequence").notNull(),
  webhookSubscriptions: jsonb("webhook_subscriptions").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  status: appointmentStatus("status").notNull().default("booked"),
  recoveryStatus: recoveryStatus("recovery_status").notNull().default("not_started"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const lifecycleEvents = pgTable("lifecycle_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  actorType: text("actor_type").notNull(),
  actorId: uuid("actor_id"),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  previousState: text("previous_state"),
  newState: text("new_state"),
  source: text("source").notNull(),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const engagementScores = pgTable("engagement_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  score: integer("score").notNull(),
  churnRisk: text("churn_risk").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const ltvRecords = pgTable("ltv_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  consultationsCompleted: integer("consultations_completed").notNull().default(0),
  avgRevenue: numeric("avg_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  prescriptionsRenewed: integer("prescriptions_renewed").notNull().default(0),
  renewalValue: numeric("renewal_value", { precision: 12, scale: 2 }).notNull().default("0"),
  ltv: numeric("ltv", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  url: text("url").notNull(),
  eventNames: jsonb("event_names").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

