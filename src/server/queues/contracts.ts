import { z } from "zod";
import { canonicalLifecycleEvents } from "@/domain/events";

const baseJobSchema = z.object({
  tenantId: z.string().uuid(),
  correlationId: z.string().min(1)
});

export const reminderJobSchema = baseJobSchema.extend({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  offset: z.enum(["48h", "24h", "2h", "30m"]),
  scheduledFor: z.coerce.date()
});

export const recoveryJobSchema = baseJobSchema.extend({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  attempt: z.number().int().min(1).max(10),
  reason: z.enum(["unconfirmed", "no_show"])
});

export const followupJobSchema = baseJobSchema.extend({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  sequenceDay: z.number().int().min(1).max(365),
  category: z.enum(["wellness_check", "satisfaction", "prescription", "exam", "re_engagement"])
});

export const engagementAnalysisJobSchema = baseJobSchema.extend({
  patientId: z.string().uuid(),
  triggerEventName: z.enum(canonicalLifecycleEvents)
});

export const realtimeEventJobSchema = baseJobSchema.extend({
  eventId: z.string().uuid(),
  eventName: z.enum(canonicalLifecycleEvents),
  entityType: z.string().min(1),
  entityId: z.string().uuid()
});

export const webhookJobSchema = baseJobSchema.extend({
  eventId: z.string().uuid(),
  eventName: z.enum(canonicalLifecycleEvents),
  subscriptionId: z.string().uuid(),
  url: z.string().url(),
  payload: z.record(z.string(), z.unknown())
});

export type ReminderJobData = z.infer<typeof reminderJobSchema>;
export type RecoveryJobData = z.infer<typeof recoveryJobSchema>;
export type FollowupJobData = z.infer<typeof followupJobSchema>;
export type EngagementAnalysisJobData = z.infer<typeof engagementAnalysisJobSchema>;
export type RealtimeEventJobData = z.infer<typeof realtimeEventJobSchema>;
export type WebhookJobData = z.infer<typeof webhookJobSchema>;

export type CareLoopJobData =
  | ReminderJobData
  | RecoveryJobData
  | FollowupJobData
  | EngagementAnalysisJobData
  | RealtimeEventJobData
  | WebhookJobData;

