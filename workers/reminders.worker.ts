import { Worker } from "bullmq";
import { processReminderJob } from "@/server/queues/processors";
import { queueNames } from "@/server/queues/names";
import { getRedis } from "@/server/redis/client";

export function createRemindersWorker() {
  return new Worker(queueNames.reminders, processReminderJob, {
    connection: getRedis(),
    concurrency: 10
  });
}
