import type { JobsOptions } from "bullmq";
import {
  engagementAnalysisJobSchema,
  followupJobSchema,
  realtimeEventJobSchema,
  recoveryJobSchema,
  reminderJobSchema,
  webhookJobSchema,
  type EngagementAnalysisJobData,
  type FollowupJobData,
  type RealtimeEventJobData,
  type RecoveryJobData,
  type ReminderJobData,
  type WebhookJobData
} from "./contracts";
import {
  createFollowupJobId,
  createRecoveryJobId,
  createReminderJobId,
  createWebhookJobId,
  createIdempotencyKey
} from "./idempotency";
import { getQueue } from "./client";
import { queueNames } from "./names";

export type QueueLike<TData> = {
  add: (name: string, data: TData, options?: JobsOptions) => Promise<unknown>;
};

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000
  },
  removeOnComplete: 100,
  removeOnFail: false
};

async function scheduleJob<TData>(
  queue: QueueLike<TData>,
  jobName: string,
  data: TData,
  options: JobsOptions
) {
  return queue.add(jobName, data, {
    ...defaultJobOptions,
    ...options
  });
}

export function scheduleReminderJob(
  data: ReminderJobData,
  queue: QueueLike<ReminderJobData> = getQueue(queueNames.reminders) as QueueLike<ReminderJobData>
) {
  const parsed = reminderJobSchema.parse(data);
  return scheduleJob(queue, "reminder.send", parsed, {
    jobId: createReminderJobId(parsed),
    delay: Math.max(parsed.scheduledFor.getTime() - Date.now(), 0)
  });
}

export function scheduleRecoveryJob(
  data: RecoveryJobData,
  queue: QueueLike<RecoveryJobData> = getQueue(queueNames.recovery) as QueueLike<RecoveryJobData>
) {
  const parsed = recoveryJobSchema.parse(data);
  return scheduleJob(queue, "recovery.attempt", parsed, {
    jobId: createRecoveryJobId(parsed)
  });
}

export function scheduleFollowupJob(
  data: FollowupJobData,
  queue: QueueLike<FollowupJobData> = getQueue(queueNames.followups) as QueueLike<FollowupJobData>
) {
  const parsed = followupJobSchema.parse(data);
  return scheduleJob(queue, "followup.send", parsed, {
    jobId: createFollowupJobId(parsed)
  });
}

export function scheduleEngagementAnalysisJob(
  data: EngagementAnalysisJobData,
  queue: QueueLike<EngagementAnalysisJobData> = getQueue(queueNames.engagementAnalysis) as QueueLike<EngagementAnalysisJobData>
) {
  const parsed = engagementAnalysisJobSchema.parse(data);
  return scheduleJob(queue, "engagement.analyze", parsed, {
    jobId: createIdempotencyKey("engagement", [
      parsed.tenantId,
      parsed.patientId,
      parsed.triggerEventName,
      parsed.correlationId
    ])
  });
}

export function scheduleRealtimeEventJob(
  data: RealtimeEventJobData,
  queue: QueueLike<RealtimeEventJobData> = getQueue(queueNames.realtimeEvents) as QueueLike<RealtimeEventJobData>
) {
  const parsed = realtimeEventJobSchema.parse(data);
  return scheduleJob(queue, "realtime.publish", parsed, {
    jobId: createIdempotencyKey("realtime", [parsed.tenantId, parsed.eventId])
  });
}

export function scheduleWebhookJob(
  data: WebhookJobData,
  queue: QueueLike<WebhookJobData> = getQueue(queueNames.webhooks) as QueueLike<WebhookJobData>
) {
  const parsed = webhookJobSchema.parse(data);
  return scheduleJob(queue, "webhook.dispatch", parsed, {
    attempts: 5,
    jobId: createWebhookJobId(parsed)
  });
}
