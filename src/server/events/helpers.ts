import type { CareLoopDb } from "@/server/repositories/core";
import type { TenantContext } from "@/server/tenant/context";
import { emitLifecycleEvent, type WebhookSubscriptionConfig } from "./emitter";

type EventHelperInput = {
  entityId: string;
  payload?: Record<string, unknown>;
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
};

export function emitAppointmentBooked(db: CareLoopDb, context: TenantContext, input: EventHelperInput) {
  return emitLifecycleEvent(db, context, {
    name: "appointment.booked",
    entityType: "appointment",
    ...input
  });
}

export function emitRecoveryAttempted(db: CareLoopDb, context: TenantContext, input: EventHelperInput) {
  return emitLifecycleEvent(db, context, {
    name: "recovery.attempted",
    entityType: "appointment",
    ...input
  });
}

export function emitRecoverySucceeded(db: CareLoopDb, context: TenantContext, input: EventHelperInput) {
  return emitLifecycleEvent(db, context, {
    name: "recovery.succeeded",
    entityType: "appointment",
    ...input
  });
}

export function emitRecoveryFailed(db: CareLoopDb, context: TenantContext, input: EventHelperInput) {
  return emitLifecycleEvent(db, context, {
    name: "recovery.failed",
    entityType: "appointment",
    ...input
  });
}

export function emitLtvUpdated(db: CareLoopDb, context: TenantContext, input: EventHelperInput) {
  return emitLifecycleEvent(db, context, {
    name: "ltv.updated",
    entityType: "patient",
    ...input
  });
}

