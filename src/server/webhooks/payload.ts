import type { LifecycleEventName } from "@/domain/events";

export type WebhookEventEnvelope = {
  eventId: string;
  eventName: LifecycleEventName;
  tenantId: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  occurredAt: string;
  data: Record<string, unknown>;
};

const blockedPayloadKeys = new Set([
  "name",
  "email",
  "phone",
  "address",
  "dateOfBirth",
  "medicalHistory",
  "medication",
  "consultationNotes",
  "freeTextMessage",
  "rawPatientMessage"
]);

export function minimizeWebhookData(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !blockedPayloadKeys.has(key))
  );
}

export function createWebhookEnvelope(input: {
  eventId: string;
  eventName: LifecycleEventName;
  tenantId: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  occurredAt?: Date;
  payload?: Record<string, unknown>;
}): WebhookEventEnvelope {
  return {
    eventId: input.eventId,
    eventName: input.eventName,
    tenantId: input.tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    correlationId: input.correlationId,
    occurredAt: (input.occurredAt ?? new Date()).toISOString(),
    data: minimizeWebhookData(input.payload ?? {})
  };
}

