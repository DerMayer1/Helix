import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export const aiContextStatus = pgEnum("ai_context_status", [
  "generated",
  "fallback",
  "rejected"
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("tenants_slug_unique").on(table.slug)
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  role: userRole("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("users_tenant_id_idx").on(table.tenantId),
  uniqueIndex("users_tenant_email_unique").on(table.tenantId, table.email)
]);

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  displayName: text("display_name").notNull(),
  contactPreference: text("contact_preference").notNull().default("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("patients_tenant_id_idx").on(table.tenantId)
]);

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  reminderSchedule: jsonb("reminder_schedule").notNull(),
  recoveryBehavior: jsonb("recovery_behavior").notNull(),
  postCareSequence: jsonb("post_care_sequence").notNull(),
  webhookSubscriptions: jsonb("webhook_subscriptions").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("automation_rules_tenant_id_idx").on(table.tenantId),
  uniqueIndex("automation_rules_tenant_name_unique").on(table.tenantId, table.name)
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  status: appointmentStatus("status").notNull().default("booked"),
  recoveryStatus: recoveryStatus("recovery_status").notNull().default("not_started"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("appointments_tenant_id_idx").on(table.tenantId),
  index("appointments_tenant_patient_idx").on(table.tenantId, table.patientId),
  index("appointments_tenant_scheduled_at_idx").on(table.tenantId, table.scheduledAt)
]);

export const lifecycleEvents = pgTable("lifecycle_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  payload: jsonb("payload").notNull(),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("lifecycle_events_tenant_id_idx").on(table.tenantId),
  index("lifecycle_events_tenant_entity_idx").on(table.tenantId, table.entityType, table.entityId),
  index("lifecycle_events_tenant_name_idx").on(table.tenantId, table.name)
]);

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
}, (table) => [
  index("audit_logs_tenant_id_idx").on(table.tenantId),
  index("audit_logs_tenant_target_idx").on(table.tenantId, table.targetType, table.targetId)
]);

export const engagementScores = pgTable("engagement_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  score: integer("score").notNull(),
  churnRisk: text("churn_risk").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("engagement_scores_tenant_id_idx").on(table.tenantId),
  uniqueIndex("engagement_scores_tenant_patient_unique").on(table.tenantId, table.patientId)
]);

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
}, (table) => [
  index("ltv_records_tenant_id_idx").on(table.tenantId),
  uniqueIndex("ltv_records_tenant_patient_unique").on(table.tenantId, table.patientId)
]);

export const aiClinicalContexts = pgTable("ai_clinical_contexts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  status: aiContextStatus("status").notNull(),
  source: text("source").notNull(),
  summary: text("summary").notNull(),
  safetyFlags: jsonb("safety_flags").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("ai_clinical_contexts_tenant_id_idx").on(table.tenantId),
  index("ai_clinical_contexts_tenant_appointment_idx").on(table.tenantId, table.appointmentId),
  index("ai_clinical_contexts_tenant_patient_idx").on(table.tenantId, table.patientId)
]);

export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  url: text("url").notNull(),
  eventNames: jsonb("event_names").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("webhook_subscriptions_tenant_id_idx").on(table.tenantId)
]);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  automationRules: many(automationRules),
  users: many(users),
  patients: many(patients),
  appointments: many(appointments),
  lifecycleEvents: many(lifecycleEvents),
  auditLogs: many(auditLogs),
  engagementScores: many(engagementScores),
  ltvRecords: many(ltvRecords),
  aiClinicalContexts: many(aiClinicalContexts),
  webhookSubscriptions: many(webhookSubscriptions)
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id]
  })
}));

export const patientsRelations = relations(patients, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [patients.tenantId],
    references: [tenants.id]
  }),
  appointments: many(appointments),
  engagementScores: many(engagementScores),
  ltvRecords: many(ltvRecords),
  aiClinicalContexts: many(aiClinicalContexts)
}));

export const automationRulesRelations = relations(automationRules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [automationRules.tenantId],
    references: [tenants.id]
  })
}));

export const appointmentsRelations = relations(appointments, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id]
  }),
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id]
  }),
  aiClinicalContexts: many(aiClinicalContexts)
}));

export const aiClinicalContextsRelations = relations(aiClinicalContexts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [aiClinicalContexts.tenantId],
    references: [tenants.id]
  }),
  appointment: one(appointments, {
    fields: [aiClinicalContexts.appointmentId],
    references: [appointments.id]
  }),
  patient: one(patients, {
    fields: [aiClinicalContexts.patientId],
    references: [patients.id]
  })
}));

export const lifecycleEventsRelations = relations(lifecycleEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [lifecycleEvents.tenantId],
    references: [tenants.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id]
  })
}));

export const engagementScoresRelations = relations(engagementScores, ({ one }) => ({
  tenant: one(tenants, {
    fields: [engagementScores.tenantId],
    references: [tenants.id]
  }),
  patient: one(patients, {
    fields: [engagementScores.patientId],
    references: [patients.id]
  })
}));

export const ltvRecordsRelations = relations(ltvRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ltvRecords.tenantId],
    references: [tenants.id]
  }),
  patient: one(patients, {
    fields: [ltvRecords.patientId],
    references: [patients.id]
  })
}));

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [webhookSubscriptions.tenantId],
    references: [tenants.id]
  })
}));
