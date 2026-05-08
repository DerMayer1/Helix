import type { LifecycleEventName } from "@/domain/events";
import { emitLifecycleEvent, emitStateChanged, type WebhookSubscriptionConfig } from "@/server/events/emitter";
import {
  createAppointment,
  recordAuditLog,
  transitionAppointment,
  upsertEngagementScore,
  type CareLoopDb
} from "@/server/repositories/core";
import { scheduleReminderJob } from "@/server/queues/scheduler";
import type { ReminderJobData } from "@/server/queues/contracts";
import { assertTenantAccess, type TenantContext } from "@/server/tenant/context";
import type {
  CreateAppointmentInput,
  RecordAuditLogInput,
  UpsertEngagementScoreInput
} from "@/server/validation/core";
import { buildReminderJobs, type ReminderOffset } from "./reminders";

export type AppointmentRecord = {
  id: string;
  tenantId: string;
  patientId: string;
  status: "booked" | "confirmed" | "completed" | "cancelled" | "no_show";
  recoveryStatus: "not_started" | "in_progress" | "succeeded" | "failed";
  scheduledAt: Date;
};

export type AppointmentTransitionResult = {
  previous: AppointmentRecord;
  appointment: AppointmentRecord;
};

export type LifecycleEventInput = {
  name: LifecycleEventName;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
};

export type AppointmentLifecyclePorts = {
  createAppointment: (context: TenantContext, input: CreateAppointmentInput) => Promise<AppointmentRecord>;
  transitionAppointment: (
    context: TenantContext,
    input: { appointmentId: string; status?: AppointmentRecord["status"]; recoveryStatus?: AppointmentRecord["recoveryStatus"] }
  ) => Promise<AppointmentTransitionResult>;
  scheduleReminderJob: (job: ReminderJobData) => Promise<unknown>;
  emitLifecycleEvent: (context: TenantContext, input: LifecycleEventInput) => Promise<unknown>;
  emitStateChanged: (context: TenantContext, input: Omit<LifecycleEventInput, "name">) => Promise<unknown>;
  recordAuditLog: (context: TenantContext, input: RecordAuditLogInput) => Promise<unknown>;
  upsertEngagementScore: (context: TenantContext, input: UpsertEngagementScoreInput) => Promise<unknown>;
};

export type BookAppointmentLifecycleInput = CreateAppointmentInput & {
  reminderOffsets?: readonly ReminderOffset[];
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
  now?: Date;
};

export type ConfirmAppointmentLifecycleInput = {
  appointmentId: string;
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
};

export type MarkAppointmentUnresponsiveInput = {
  appointmentId: string;
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
};

export function createAppointmentLifecyclePorts(db: CareLoopDb): AppointmentLifecyclePorts {
  return {
    createAppointment: (context, input) => createAppointment(db, context, input),
    transitionAppointment: (context, input) => transitionAppointment(db, context, input),
    scheduleReminderJob,
    emitLifecycleEvent: (context, input) => emitLifecycleEvent(db, context, input),
    emitStateChanged: (context, input) => emitStateChanged(db, context, input),
    recordAuditLog: (context, input) => recordAuditLog(db, context, input),
    upsertEngagementScore: (context, input) => upsertEngagementScore(db, context, input)
  };
}

export async function bookAppointmentLifecycle(
  context: TenantContext,
  input: BookAppointmentLifecycleInput,
  ports: AppointmentLifecyclePorts
) {
  const appointment = await ports.createAppointment(context, input);
  assertTenantAccess(context, appointment);

  const reminderJobs = buildReminderJobs({
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    scheduledAt: appointment.scheduledAt,
    offsets: input.reminderOffsets,
    now: input.now
  });

  await Promise.all(reminderJobs.map((job) => ports.scheduleReminderJob(job)));

  await ports.emitLifecycleEvent(context, {
    name: "queue.job_scheduled",
    entityType: "appointment",
    entityId: appointment.id,
    payload: {
      queue: "reminders",
      jobCount: reminderJobs.length,
      offsets: reminderJobs.map((job) => job.offset)
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.emitLifecycleEvent(context, {
    name: "appointment.booked",
    entityType: "appointment",
    entityId: appointment.id,
    payload: {
      patientId: appointment.patientId,
      scheduledAt: appointment.scheduledAt.toISOString(),
      remindersScheduled: reminderJobs.length
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.emitStateChanged(context, {
    entityType: "appointment",
    entityId: appointment.id,
    payload: {
      previousState: null,
      newState: appointment.status,
      reason: "appointment.booked"
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.recordAuditLog(context, {
    actorType: "system",
    targetType: "appointment",
    targetId: appointment.id,
    newState: "reminders_scheduled",
    source: "queue.job_scheduled",
    correlationId: context.correlationId
  });

  await ports.recordAuditLog(context, {
    actorType: context.actor.type,
    actorId: context.actor.id,
    targetType: "appointment",
    targetId: appointment.id,
    newState: appointment.status,
    source: "appointment.booked",
    correlationId: context.correlationId
  });

  await ports.upsertEngagementScore(context, {
    patientId: appointment.patientId,
    score: 50,
    churnRisk: "moderate"
  });

  return {
    appointment,
    reminderJobs
  };
}

export async function confirmAppointmentLifecycle(
  context: TenantContext,
  input: ConfirmAppointmentLifecycleInput,
  ports: AppointmentLifecyclePorts
) {
  const transition = await ports.transitionAppointment(context, {
    appointmentId: input.appointmentId,
    status: "confirmed",
    recoveryStatus: "succeeded"
  });
  assertTenantAccess(context, transition.appointment);

  await ports.emitLifecycleEvent(context, {
    name: "patient.confirmed",
    entityType: "appointment",
    entityId: transition.appointment.id,
    payload: {
      patientId: transition.appointment.patientId,
      previousStatus: transition.previous.status,
      newStatus: transition.appointment.status
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.emitStateChanged(context, {
    entityType: "appointment",
    entityId: transition.appointment.id,
    payload: {
      previousState: transition.previous.status,
      newState: transition.appointment.status,
      reason: "patient.confirmed"
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.recordAuditLog(context, {
    actorType: context.actor.type,
    actorId: context.actor.id,
    targetType: "appointment",
    targetId: transition.appointment.id,
    previousState: transition.previous.status,
    newState: transition.appointment.status,
    source: "patient.confirmed",
    correlationId: context.correlationId
  });

  await ports.upsertEngagementScore(context, {
    patientId: transition.appointment.patientId,
    score: 75,
    churnRisk: "retained"
  });

  return transition;
}

export async function markAppointmentUnresponsiveLifecycle(
  context: TenantContext,
  input: MarkAppointmentUnresponsiveInput,
  ports: AppointmentLifecyclePorts
) {
  const transition = await ports.transitionAppointment(context, {
    appointmentId: input.appointmentId,
    recoveryStatus: "in_progress"
  });
  assertTenantAccess(context, transition.appointment);

  await ports.emitLifecycleEvent(context, {
    name: "patient.unresponsive",
    entityType: "appointment",
    entityId: transition.appointment.id,
    payload: {
      patientId: transition.appointment.patientId,
      appointmentStatus: transition.appointment.status,
      recoveryStatus: transition.appointment.recoveryStatus
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.emitLifecycleEvent(context, {
    name: "recovery.started",
    entityType: "appointment",
    entityId: transition.appointment.id,
    payload: {
      patientId: transition.appointment.patientId,
      reason: "unconfirmed"
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.emitStateChanged(context, {
    entityType: "appointment",
    entityId: transition.appointment.id,
    payload: {
      previousState: transition.previous.recoveryStatus,
      newState: transition.appointment.recoveryStatus,
      reason: "patient.unresponsive"
    },
    webhookSubscriptions: input.webhookSubscriptions
  });

  await ports.recordAuditLog(context, {
    actorType: context.actor.type,
    actorId: context.actor.id,
    targetType: "appointment",
    targetId: transition.appointment.id,
    previousState: transition.previous.recoveryStatus,
    newState: transition.appointment.recoveryStatus,
    source: "patient.unresponsive",
    correlationId: context.correlationId
  });

  await ports.upsertEngagementScore(context, {
    patientId: transition.appointment.patientId,
    score: 35,
    churnRisk: "high"
  });

  return transition;
}
