import type { LifecycleEventName } from "@/domain/events";
import type { CareLoopDb } from "@/server/repositories/core";
import { recordLifecycleEvent } from "@/server/repositories/core";
import type { TenantContext } from "@/server/tenant/context";
import { logger } from "@/server/observability/logger";
import { scheduleRealtimeEventJob, scheduleWebhookJob } from "@/server/queues/scheduler";
import { createWebhookEnvelope } from "@/server/webhooks/payload";

export type WebhookSubscriptionConfig = {
  id: string;
  url: string;
  eventNames: readonly LifecycleEventName[];
  enabled: boolean;
};

export type EmitLifecycleEventInput = {
  name: LifecycleEventName;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
};

export async function emitLifecycleEvent(
  db: CareLoopDb,
  context: TenantContext,
  input: EmitLifecycleEventInput
) {
  const event = await recordLifecycleEvent(db, context, {
    name: input.name,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload ?? {},
    correlationId: context.correlationId
  });

  logger.info("Lifecycle event emitted.", {
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    eventId: event.id,
    operation: input.name
  });

  await scheduleRealtimeEventJob({
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    eventId: event.id,
    eventName: input.name,
    entityType: input.entityType,
    entityId: input.entityId
  });

  await scheduleMatchingWebhooks(context, event.id, input);

  return event;
}

export function emitStateChanged(
  db: CareLoopDb,
  context: TenantContext,
  input: Omit<EmitLifecycleEventInput, "name">
) {
  return emitLifecycleEvent(db, context, {
    ...input,
    name: "state.changed"
  });
}

async function scheduleMatchingWebhooks(
  context: TenantContext,
  eventId: string,
  input: EmitLifecycleEventInput
) {
  const subscriptions = (input.webhookSubscriptions ?? []).filter(
    (subscription) => subscription.enabled && subscription.eventNames.includes(input.name)
  );

  await Promise.all(subscriptions.map((subscription) => scheduleWebhookJob({
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    subscriptionId: subscription.id,
    url: subscription.url,
    eventId,
    eventName: input.name,
    payload: { ...createWebhookEnvelope({
      eventId,
      eventName: input.name,
      tenantId: context.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      correlationId: context.correlationId,
      payload: input.payload
    }) }
  })));
}
