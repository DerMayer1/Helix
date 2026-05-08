import { Worker } from "bullmq";
import { processAiClinicalContextJob } from "@/server/queues/processors";
import { queueNames } from "@/server/queues/names";
import { getRedis } from "@/server/redis/client";

export function createAiContextWorker() {
  return new Worker(queueNames.aiClinicalContext, processAiClinicalContextJob, {
    connection: getRedis(),
    concurrency: 4
  });
}
