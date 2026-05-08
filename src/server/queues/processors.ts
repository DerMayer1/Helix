import type { Job } from "bullmq";
import { logger } from "@/server/observability/logger";
import {
  aiClinicalContextJobSchema,
  engagementAnalysisJobSchema,
  followupJobSchema,
  realtimeEventJobSchema,
  recoveryJobSchema,
  reminderJobSchema,
  webhookJobSchema
} from "./contracts";

function logJobStart(job: Job, operation: string, tenantId: string, correlationId: string) {
  logger.info("Queue job started.", {
    tenantId,
    correlationId,
    jobId: job.id,
    operation
  });
}

export async function processReminderJob(job: Job) {
  const data = reminderJobSchema.parse(job.data);
  logJobStart(job, "reminder.send", data.tenantId, data.correlationId);
  return { ok: true };
}

export async function processRecoveryJob(job: Job) {
  const data = recoveryJobSchema.parse(job.data);
  logJobStart(job, "recovery.attempt", data.tenantId, data.correlationId);
  return { ok: true };
}

export async function processFollowupJob(job: Job) {
  const data = followupJobSchema.parse(job.data);
  logJobStart(job, "followup.send", data.tenantId, data.correlationId);
  return { ok: true };
}

export async function processEngagementAnalysisJob(job: Job) {
  const data = engagementAnalysisJobSchema.parse(job.data);
  logJobStart(job, "engagement.analyze", data.tenantId, data.correlationId);
  return { ok: true };
}

export async function processAiClinicalContextJob(job: Job) {
  const data = aiClinicalContextJobSchema.parse(job.data);
  logJobStart(job, "ai.context.generate", data.tenantId, data.correlationId);
  return { ok: true };
}

export async function processRealtimeEventJob(job: Job) {
  const data = realtimeEventJobSchema.parse(job.data);
  logJobStart(job, "realtime.publish", data.tenantId, data.correlationId);
  return { ok: true };
}

export async function processWebhookJob(job: Job) {
  const data = webhookJobSchema.parse(job.data);
  logJobStart(job, "webhook.dispatch", data.tenantId, data.correlationId);
  return { ok: true };
}
