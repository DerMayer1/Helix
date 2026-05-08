import type { Queue } from "bullmq";
import { getQueue } from "./client";
import { queueNames, type QueueName } from "./names";

export type QueueVisibility = {
  name: QueueName;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
};

export type QueueVisibilitySource = Pick<Queue, "getJobCounts">;

export async function getQueueVisibility(
  name: QueueName,
  queue: QueueVisibilitySource = getQueue(name)
): Promise<QueueVisibility> {
  const counts = await queue.getJobCounts("waiting", "active", "delayed", "completed", "failed", "paused");

  return {
    name,
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    delayed: counts.delayed ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    paused: counts.paused ?? 0
  };
}

export async function getCoreQueueVisibility() {
  return Promise.all(Object.values(queueNames).map((name) => getQueueVisibility(name)));
}

