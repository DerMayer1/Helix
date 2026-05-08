import { Worker } from "bullmq";
import { processRecoveryJob } from "@/server/queues/processors";
import { queueNames } from "@/server/queues/names";
import { getRedis } from "@/server/redis/client";

export function createRecoveryWorker() {
  return new Worker(queueNames.recovery, processRecoveryJob, {
    connection: getRedis(),
    concurrency: 5
  });
}
