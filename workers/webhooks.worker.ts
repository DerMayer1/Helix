import { Worker } from "bullmq";
import { processWebhookJob } from "@/server/queues/processors";
import { queueNames } from "@/server/queues/names";
import { getRedis } from "@/server/redis/client";

export function createWebhooksWorker() {
  return new Worker(queueNames.webhooks, processWebhookJob, {
    connection: getRedis(),
    concurrency: 20
  });
}
