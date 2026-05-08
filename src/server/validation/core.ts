import { z } from "zod";
import { canonicalLifecycleEvents } from "@/domain/events";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const createTenantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/)
});

export const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["admin", "physician", "staff"])
});

export const createPatientSchema = z.object({
  displayName: z.string().min(1).max(120),
  contactPreference: z.enum(["email", "sms", "phone", "whatsapp"]).default("email")
});

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
  reminderSchedule: jsonObjectSchema,
  recoveryBehavior: jsonObjectSchema,
  postCareSequence: jsonObjectSchema,
  webhookSubscriptions: jsonObjectSchema
});

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  scheduledAt: z.coerce.date()
});

export const transitionAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(["booked", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  recoveryStatus: z.enum(["not_started", "in_progress", "succeeded", "failed"]).optional()
}).refine((value) => value.status || value.recoveryStatus, {
  message: "At least one appointment state field must be provided."
});

export const recordLifecycleEventSchema = z.object({
  name: z.enum(canonicalLifecycleEvents),
  entityType: z.string().min(1).max(80),
  entityId: z.string().uuid(),
  payload: jsonObjectSchema.default({}),
  correlationId: z.string().min(1)
});

export const recordAuditLogSchema = z.object({
  actorType: z.enum(["user", "job", "webhook", "system"]),
  actorId: z.string().uuid().optional(),
  targetType: z.string().min(1).max(80),
  targetId: z.string().uuid(),
  previousState: z.string().max(80).optional(),
  newState: z.string().max(80).optional(),
  source: z.string().min(1).max(120),
  correlationId: z.string().min(1)
});

export const upsertEngagementScoreSchema = z.object({
  patientId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  churnRisk: z.enum(["high", "moderate", "retained"])
});

export const upsertLtvRecordSchema = z.object({
  patientId: z.string().uuid(),
  consultationsCompleted: z.number().int().min(0),
  avgRevenue: z.number().min(0),
  prescriptionsRenewed: z.number().int().min(0),
  renewalValue: z.number().min(0)
});

export const scheduleRecoveryAttemptSchema = z.object({
  appointmentId: z.string().uuid(),
  attempt: z.number().int().min(1).max(10),
  reason: z.enum(["unconfirmed", "no_show"]).default("unconfirmed")
});

export const recoveryOutcomeSchema = z.object({
  appointmentId: z.string().uuid(),
  outcomeReason: z.string().min(1).max(120).default("workflow_transition")
});

export const completeConsultationSchema = z.object({
  appointmentId: z.string().uuid(),
  postCareDays: z.array(z.number().int().min(1).max(365)).min(1).default([1, 7, 30])
});

export const prescriptionRenewalSignalSchema = z.object({
  patientId: z.string().uuid(),
  sequenceDay: z.number().int().min(1).max(365).default(1)
});

export const patientReturnedSchema = upsertLtvRecordSchema.extend({
  source: z.enum(["return_visit", "prescription_renewal", "postcare_engagement"]).default("return_visit")
});

export type CreateTenantInput = z.input<typeof createTenantSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreatePatientInput = z.input<typeof createPatientSchema>;
export type CreateAutomationRuleInput = z.input<typeof createAutomationRuleSchema>;
export type CreateAppointmentInput = z.input<typeof createAppointmentSchema>;
export type TransitionAppointmentInput = z.input<typeof transitionAppointmentSchema>;
export type RecordLifecycleEventInput = z.input<typeof recordLifecycleEventSchema>;
export type RecordAuditLogInput = z.input<typeof recordAuditLogSchema>;
export type UpsertEngagementScoreInput = z.input<typeof upsertEngagementScoreSchema>;
export type UpsertLtvRecordInput = z.input<typeof upsertLtvRecordSchema>;
export type ScheduleRecoveryAttemptInput = z.input<typeof scheduleRecoveryAttemptSchema>;
export type RecoveryOutcomeInput = z.input<typeof recoveryOutcomeSchema>;
export type CompleteConsultationInput = z.input<typeof completeConsultationSchema>;
export type PrescriptionRenewalSignalInput = z.input<typeof prescriptionRenewalSignalSchema>;
export type PatientReturnedInput = z.input<typeof patientReturnedSchema>;
