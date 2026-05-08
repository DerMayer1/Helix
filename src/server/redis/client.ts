import IORedis from "ioredis";
import { getEnv } from "@/server/config/env";

let redis: IORedis | null = null;

export function getRedis() {
  if (!redis) {
    redis = new IORedis(getEnv().REDIS_URL, {
      maxRetriesPerRequest: null
    });
  }

  return redis;
}

export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
