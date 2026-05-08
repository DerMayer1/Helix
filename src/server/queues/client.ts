import { Queue } from "bullmq";
import { getRedis } from "@/server/redis/client";
import { queueNames, type QueueName } from "./names";

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName) {
  const existing = queues.get(name);

  if (existing) {
    return existing;
  }

  const queue = new Queue(name, {
    connection: getRedis()
  });

  queues.set(name, queue);
  return queue;
}

export function getCoreQueues() {
  return {
    reminders: getQueue(queueNames.reminders),
    followups: getQueue(queueNames.followups),
    recovery: getQueue(queueNames.recovery),
    aiClinicalContext: getQueue(queueNames.aiClinicalContext),
    webhooks: getQueue(queueNames.webhooks),
    engagementAnalysis: getQueue(queueNames.engagementAnalysis),
    realtimeEvents: getQueue(queueNames.realtimeEvents)
  };
}
