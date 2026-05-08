import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { calculateLtv } from "@/domain/ltv";
import type { TenantContext } from "@/server/tenant/context";
import {
  createAppointmentSchema,
  createAutomationRuleSchema,
  createPatientSchema,
  createTenantSchema,
  createUserSchema,
  recordAuditLogSchema,
  recordLifecycleEventSchema,
  aiClinicalContextResultSchema,
  transitionAppointmentSchema,
  upsertEngagementScoreSchema,
  upsertLtvRecordSchema,
  type CreateAppointmentInput,
  type CreateAutomationRuleInput,
  type CreatePatientInput,
  type CreateTenantInput,
  type CreateUserInput,
  type RecordAuditLogInput,
  type RecordLifecycleEventInput,
  type AiClinicalContextResultInput,
  type TransitionAppointmentInput,
  type UpsertEngagementScoreInput,
  type UpsertLtvRecordInput
} from "@/server/validation/core";
import * as schema from "@/server/db/schema";

export type CareLoopDb = NodePgDatabase<typeof schema>;

function requireInsertedRow<TRow>(row: TRow | undefined, entityName: string) {
  if (!row) {
    throw new Error(`Failed to create ${entityName}.`);
  }

  return row;
}

export async function createTenant(db: CareLoopDb, input: CreateTenantInput) {
  const parsed = createTenantSchema.parse(input);
  const [tenant] = await db.insert(schema.tenants).values(parsed).returning();
  return requireInsertedRow(tenant, "tenant");
}

export async function createUser(db: CareLoopDb, context: TenantContext, input: CreateUserInput) {
  const parsed = createUserSchema.parse(input);
  const [user] = await db.insert(schema.users).values({
    ...parsed,
    tenantId: context.tenantId
  }).returning();
  return requireInsertedRow(user, "user");
}

export async function createPatient(
  db: CareLoopDb,
  context: TenantContext,
  input: CreatePatientInput
) {
  const parsed = createPatientSchema.parse(input);
  const [patient] = await db.insert(schema.patients).values({
    ...parsed,
    tenantId: context.tenantId
  }).returning();
  return requireInsertedRow(patient, "patient");
}

export async function listPatients(db: CareLoopDb, context: TenantContext) {
  return db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.tenantId, context.tenantId))
    .orderBy(desc(schema.patients.createdAt));
}

export async function getPatientById(
  db: CareLoopDb,
  context: TenantContext,
  patientId: string
) {
  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(and(
      eq(schema.patients.tenantId, context.tenantId),
      eq(schema.patients.id, patientId)
    ))
    .limit(1);

  return patient ?? null;
}

export async function createAutomationRule(
  db: CareLoopDb,
  context: TenantContext,
  input: CreateAutomationRuleInput
) {
  const parsed = createAutomationRuleSchema.parse(input);
  const [rule] = await db.insert(schema.automationRules).values({
    ...parsed,
    tenantId: context.tenantId
  }).returning();
  return requireInsertedRow(rule, "automation rule");
}

export async function listAutomationRules(db: CareLoopDb, context: TenantContext) {
  return db
    .select()
    .from(schema.automationRules)
    .where(eq(schema.automationRules.tenantId, context.tenantId))
    .orderBy(desc(schema.automationRules.createdAt));
}

export async function createAppointment(
  db: CareLoopDb,
  context: TenantContext,
  input: CreateAppointmentInput
) {
  const parsed = createAppointmentSchema.parse(input);
  const patient = await getPatientById(db, context, parsed.patientId);

  if (!patient) {
    throw new Error("Tenant-scoped patient not found.");
  }

  const [appointment] = await db.insert(schema.appointments).values({
    ...parsed,
    tenantId: context.tenantId
  }).returning();
  return requireInsertedRow(appointment, "appointment");
}

export async function listAppointments(db: CareLoopDb, context: TenantContext) {
  return db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.tenantId, context.tenantId))
    .orderBy(desc(schema.appointments.scheduledAt));
}

export async function getAppointmentById(
  db: CareLoopDb,
  context: TenantContext,
  appointmentId: string
) {
  const [appointment] = await db
    .select()
    .from(schema.appointments)
    .where(and(
      eq(schema.appointments.tenantId, context.tenantId),
      eq(schema.appointments.id, appointmentId)
    ))
    .limit(1);

  return appointment ?? null;
}

export async function transitionAppointment(
  db: CareLoopDb,
  context: TenantContext,
  input: TransitionAppointmentInput
) {
  const parsed = transitionAppointmentSchema.parse(input);
  const current = await getAppointmentById(db, context, parsed.appointmentId);

  if (!current) {
    throw new Error("Tenant-scoped appointment not found.");
  }

  const [appointment] = await db
    .update(schema.appointments)
    .set({
      ...(parsed.status ? { status: parsed.status } : {}),
      ...(parsed.recoveryStatus ? { recoveryStatus: parsed.recoveryStatus } : {}),
      updatedAt: new Date()
    })
    .where(and(
      eq(schema.appointments.tenantId, context.tenantId),
      eq(schema.appointments.id, parsed.appointmentId)
    ))
    .returning();

  return {
    previous: current,
    appointment: requireInsertedRow(appointment, "appointment transition")
  };
}

export async function recordLifecycleEvent(
  db: CareLoopDb,
  context: TenantContext,
  input: RecordLifecycleEventInput
) {
  const parsed = recordLifecycleEventSchema.parse(input);
  const [event] = await db.insert(schema.lifecycleEvents).values({
    ...parsed,
    tenantId: context.tenantId
  }).returning();
  return requireInsertedRow(event, "lifecycle event");
}

export async function recordAuditLog(
  db: CareLoopDb,
  context: TenantContext,
  input: RecordAuditLogInput
) {
  const parsed = recordAuditLogSchema.parse(input);
  const [auditLog] = await db.insert(schema.auditLogs).values({
    ...parsed,
    actorId: parsed.actorId ?? context.actor.id ?? null,
    tenantId: context.tenantId
  }).returning();
  return requireInsertedRow(auditLog, "audit log");
}

export async function upsertEngagementScore(
  db: CareLoopDb,
  context: TenantContext,
  input: UpsertEngagementScoreInput
) {
  const parsed = upsertEngagementScoreSchema.parse(input);
  const [score] = await db.insert(schema.engagementScores).values({
    ...parsed,
    tenantId: context.tenantId
  }).onConflictDoUpdate({
    target: [schema.engagementScores.tenantId, schema.engagementScores.patientId],
    set: {
      score: parsed.score,
      churnRisk: parsed.churnRisk,
      updatedAt: new Date()
    }
  }).returning();
  return requireInsertedRow(score, "engagement score");
}

export async function upsertLtvRecord(
  db: CareLoopDb,
  context: TenantContext,
  input: UpsertLtvRecordInput
) {
  const parsed = upsertLtvRecordSchema.parse(input);
  const ltv = calculateLtv(parsed).toFixed(2);
  const [record] = await db.insert(schema.ltvRecords).values({
    ...parsed,
    avgRevenue: parsed.avgRevenue.toFixed(2),
    renewalValue: parsed.renewalValue.toFixed(2),
    ltv,
    tenantId: context.tenantId
  }).onConflictDoUpdate({
    target: [schema.ltvRecords.tenantId, schema.ltvRecords.patientId],
    set: {
      consultationsCompleted: parsed.consultationsCompleted,
      avgRevenue: parsed.avgRevenue.toFixed(2),
      prescriptionsRenewed: parsed.prescriptionsRenewed,
      renewalValue: parsed.renewalValue.toFixed(2),
      ltv,
      updatedAt: new Date()
    }
  }).returning();
  return requireInsertedRow(record, "LTV record");
}

export async function recordAiClinicalContext(
  db: CareLoopDb,
  context: TenantContext,
  input: AiClinicalContextResultInput
) {
  const parsed = aiClinicalContextResultSchema.parse(input);
  const appointment = await getAppointmentById(db, context, parsed.appointmentId);

  if (!appointment || appointment.patientId !== parsed.patientId) {
    throw new Error("Tenant-scoped appointment not found.");
  }

  const [record] = await db.insert(schema.aiClinicalContexts).values({
    ...parsed,
    tenantId: context.tenantId
  }).returning();

  return requireInsertedRow(record, "AI clinical context");
}
