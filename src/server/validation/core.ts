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

export type CreateTenantInput = z.input<typeof createTenantSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreatePatientInput = z.input<typeof createPatientSchema>;
export type CreateAutomationRuleInput = z.input<typeof createAutomationRuleSchema>;
export type CreateAppointmentInput = z.input<typeof createAppointmentSchema>;
export type RecordLifecycleEventInput = z.input<typeof recordLifecycleEventSchema>;
export type RecordAuditLogInput = z.input<typeof recordAuditLogSchema>;
export type UpsertEngagementScoreInput = z.input<typeof upsertEngagementScoreSchema>;
export type UpsertLtvRecordInput = z.input<typeof upsertLtvRecordSchema>;
