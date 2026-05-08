import type { LifecycleEventName } from "@/domain/events";
import { emitLifecycleEvent, emitStateChanged, type WebhookSubscriptionConfig } from "@/server/events/emitter";
import type { AppointmentRecord, AppointmentTransitionResult, LifecycleEventInput } from "@/server/appointments/lifecycle";
import {
  getAppointmentById,
  getPatientById,
  recordAuditLog,
  transitionAppointment,
  upsertEngagementScore,
  upsertLtvRecord,
  type CareLoopDb
} from "@/server/repositories/core";
import { scheduleFollowupJob, scheduleRecoveryJob } from "@/server/queues/scheduler";
import type { FollowupJobData, RecoveryJobData } from "@/server/queues/contracts";
import { assertTenantAccess, type TenantContext } from "@/server/tenant/context";
import {
  completeConsultationSchema,
  patientReturnedSchema,
  prescriptionRenewalSignalSchema,
  recoveryOutcomeSchema,
  scheduleRecoveryAttemptSchema,
  type CompleteConsultationInput,
  type PatientReturnedInput,
  type PrescriptionRenewalSignalInput,
  type RecordAuditLogInput,
  type RecoveryOutcomeInput,
  type ScheduleRecoveryAttemptInput,
  type UpsertEngagementScoreInput,
  type UpsertLtvRecordInput
} from "@/server/validation/core";

export type PatientRecord = {
  id: string;
  tenantId: string;
};

export type RetentionLifecyclePorts = {
  getAppointment: (context: TenantContext, appointmentId: string) => Promise<AppointmentRecord | null>;
  getPatient: (context: TenantContext, patientId: string) => Promise<PatientRecord | null>;
  transitionAppointment: (
    context: TenantContext,
    input: { appointmentId: string; status?: AppointmentRecord["status"]; recoveryStatus?: AppointmentRecord["recoveryStatus"] }
  ) => Promise<AppointmentTransitionResult>;
  scheduleRecoveryJob: (job: RecoveryJobData) => Promise<unknown>;
  scheduleFollowupJob: (job: FollowupJobData) => Promise<unknown>;
  emitLifecycleEvent: (context: TenantContext, input: LifecycleEventInput) => Promise<unknown>;
  emitStateChanged: (context: TenantContext, input: Omit<LifecycleEventInput, "name">) => Promise<unknown>;
  recordAuditLog: (context: TenantContext, input: RecordAuditLogInput) => Promise<unknown>;
  upsertEngagementScore: (context: TenantContext, input: UpsertEngagementScoreInput) => Promise<unknown>;
  upsertLtvRecord: (context: TenantContext, input: UpsertLtvRecordInput) => Promise<unknown>;
};

export type LifecycleInputWithWebhooks<TInput> = TInput & {
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
  now?: Date;
};

const dayMs = 24 * 60 * 60 * 1000;

export function createRetentionLifecyclePorts(db: CareLoopDb): RetentionLifecyclePorts {
  return {
    getAppointment: (context, appointmentId) => getAppointmentById(db, context, appointmentId),
    getPatient: (context, patientId) => getPatientById(db, context, patientId),
    transitionAppointment: (context, input) => transitionAppointment(db, context, input),
    scheduleRecoveryJob,
    scheduleFollowupJob,
    emitLifecycleEvent: (context, input) => emitLifecycleEvent(db, context, input),
    emitStateChanged: (context, input) => emitStateChanged(db, context, input),
    recordAuditLog: (context, input) => recordAuditLog(db, context, input),
    upsertEngagementScore: (context, input) => upsertEngagementScore(db, context, input),
    upsertLtvRecord: (context, input) => upsertLtvRecord(db, context, input)
  };
}

export async function scheduleRecoveryAttemptLifecycle(
  context: TenantContext,
  input: LifecycleInputWithWebhooks<ScheduleRecoveryAttemptInput>,
  ports: RetentionLifecyclePorts
) {
  const parsed = scheduleRecoveryAttemptSchema.parse(input);
  const appointment = await requireAppointment(context, parsed.appointmentId, ports);

  const job: RecoveryJobData = {
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    attempt: parsed.attempt,
    reason: parsed.reason
  };

  await ports.scheduleRecoveryJob(job);
  await emitEvent(context, ports, "queue.job_scheduled", "appointment", appointment.id, {
    queue: "recovery",
    attempt: parsed.attempt,
    reason: parsed.reason
  }, input.webhookSubscriptions);
  await emitEvent(context, ports, "recovery.attempted", "appointment", appointment.id, {
    patientId: appointment.patientId,
    attempt: parsed.attempt,
    reason: parsed.reason
  }, input.webhookSubscriptions);
  await audit(context, ports, appointment.id, "recovery_attempt_scheduled", "recovery.attempted");
  await ports.upsertEngagementScore(context, {
    patientId: appointment.patientId,
    score: 30,
    churnRisk: "high"
  });

  return { appointment, job };
}

export async function markRecoverySucceededLifecycle(
  context: TenantContext,
  input: LifecycleInputWithWebhooks<RecoveryOutcomeInput>,
  ports: RetentionLifecyclePorts
) {
  const parsed = recoveryOutcomeSchema.parse(input);
  const transition = await ports.transitionAppointment(context, {
    appointmentId: parsed.appointmentId,
    status: "confirmed",
    recoveryStatus: "succeeded"
  });
  assertTenantAccess(context, transition.appointment);

  await emitEvent(context, ports, "recovery.succeeded", "appointment", transition.appointment.id, {
    patientId: transition.appointment.patientId,
    outcomeReason: parsed.outcomeReason
  }, input.webhookSubscriptions);
  await emitState(context, ports, transition, "recovery.succeeded", input.webhookSubscriptions);
  await auditTransition(context, ports, transition, "recovery.succeeded");
  await ports.upsertEngagementScore(context, {
    patientId: transition.appointment.patientId,
    score: 70,
    churnRisk: "retained"
  });

  return transition;
}

export async function markRecoveryFailedLifecycle(
  context: TenantContext,
  input: LifecycleInputWithWebhooks<RecoveryOutcomeInput>,
  ports: RetentionLifecyclePorts
) {
  const parsed = recoveryOutcomeSchema.parse(input);
  const transition = await ports.transitionAppointment(context, {
    appointmentId: parsed.appointmentId,
    status: "no_show",
    recoveryStatus: "failed"
  });
  assertTenantAccess(context, transition.appointment);

  await emitEvent(context, ports, "recovery.failed", "appointment", transition.appointment.id, {
    patientId: transition.appointment.patientId,
    outcomeReason: parsed.outcomeReason
  }, input.webhookSubscriptions);
  await emitState(context, ports, transition, "recovery.failed", input.webhookSubscriptions);
  await auditTransition(context, ports, transition, "recovery.failed");
  await ports.upsertEngagementScore(context, {
    patientId: transition.appointment.patientId,
    score: 15,
    churnRisk: "high"
  });

  return transition;
}

export async function completeConsultationLifecycle(
  context: TenantContext,
  input: LifecycleInputWithWebhooks<CompleteConsultationInput>,
  ports: RetentionLifecyclePorts
) {
  const parsed = completeConsultationSchema.parse(input);
  const now = input.now ?? new Date();
  const transition = await ports.transitionAppointment(context, {
    appointmentId: parsed.appointmentId,
    status: "completed"
  });
  assertTenantAccess(context, transition.appointment);

  const followupJobs = buildFollowupJobs(context, transition.appointment, parsed.postCareDays, now);
  await Promise.all(followupJobs.map((job) => ports.scheduleFollowupJob(job)));

  await emitEvent(context, ports, "consultation.completed", "appointment", transition.appointment.id, {
    patientId: transition.appointment.patientId
  }, input.webhookSubscriptions);
  await emitEvent(context, ports, "queue.job_scheduled", "appointment", transition.appointment.id, {
    queue: "followups",
    jobCount: followupJobs.length,
    sequenceDays: parsed.postCareDays
  }, input.webhookSubscriptions);
  await emitEvent(context, ports, "postcare.sequence_scheduled", "appointment", transition.appointment.id, {
    patientId: transition.appointment.patientId,
    sequenceDays: parsed.postCareDays
  }, input.webhookSubscriptions);
  await emitState(context, ports, transition, "consultation.completed", input.webhookSubscriptions);
  await auditTransition(context, ports, transition, "consultation.completed");
  await ports.upsertEngagementScore(context, {
    patientId: transition.appointment.patientId,
    score: 85,
    churnRisk: "retained"
  });

  return { transition, followupJobs };
}

export async function monitorPrescriptionRenewalLifecycle(
  context: TenantContext,
  input: LifecycleInputWithWebhooks<PrescriptionRenewalSignalInput>,
  ports: RetentionLifecyclePorts
) {
  const parsed = prescriptionRenewalSignalSchema.parse(input);
  const patient = await requirePatient(context, parsed.patientId, ports);
  const now = input.now ?? new Date();
  const job: FollowupJobData = {
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    patientId: patient.id,
    sequenceDay: parsed.sequenceDay,
    category: "prescription",
    scheduledFor: new Date(now.getTime() + parsed.sequenceDay * dayMs)
  };

  await ports.scheduleFollowupJob(job);
  await emitEvent(context, ports, "prescription.expiring", "patient", patient.id, {
    sequenceDay: parsed.sequenceDay
  }, input.webhookSubscriptions);
  await emitEvent(context, ports, "queue.job_scheduled", "patient", patient.id, {
    queue: "followups",
    category: "prescription",
    sequenceDay: parsed.sequenceDay
  }, input.webhookSubscriptions);
  await audit(context, ports, patient.id, "prescription_renewal_monitored", "prescription.expiring", "patient");
  await ports.upsertEngagementScore(context, {
    patientId: patient.id,
    score: 55,
    churnRisk: "moderate"
  });

  return { patient, job };
}

export async function recordPatientReturnedLifecycle(
  context: TenantContext,
  input: LifecycleInputWithWebhooks<PatientReturnedInput>,
  ports: RetentionLifecyclePorts
) {
  const parsed = patientReturnedSchema.parse(input);
  const patient = await requirePatient(context, parsed.patientId, ports);

  if (parsed.source === "prescription_renewal") {
    await emitEvent(context, ports, "prescription.renewed", "patient", patient.id, {
      prescriptionsRenewed: parsed.prescriptionsRenewed
    }, input.webhookSubscriptions);
  }

  await emitEvent(context, ports, "patient.returned", "patient", patient.id, {
    source: parsed.source
  }, input.webhookSubscriptions);
  await ports.upsertLtvRecord(context, parsed);
  await emitEvent(context, ports, "ltv.updated", "patient", patient.id, {
    consultationsCompleted: parsed.consultationsCompleted,
    prescriptionsRenewed: parsed.prescriptionsRenewed,
    source: parsed.source
  }, input.webhookSubscriptions);
  await ports.emitStateChanged(context, {
    entityType: "patient",
    entityId: patient.id,
    payload: {
      previousState: "retention_pending",
      newState: "retention_positive",
      reason: "patient.returned"
    },
    webhookSubscriptions: input.webhookSubscriptions
  });
  await audit(context, ports, patient.id, "retention_positive", "patient.returned", "patient");
  await ports.upsertEngagementScore(context, {
    patientId: patient.id,
    score: 90,
    churnRisk: "retained"
  });

  return patient;
}

function buildFollowupJobs(
  context: TenantContext,
  appointment: AppointmentRecord,
  sequenceDays: readonly number[],
  now: Date
): FollowupJobData[] {
  return sequenceDays.map((sequenceDay) => ({
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    sequenceDay,
    category: "wellness_check",
    scheduledFor: new Date(now.getTime() + sequenceDay * dayMs)
  }));
}

async function requireAppointment(
  context: TenantContext,
  appointmentId: string,
  ports: RetentionLifecyclePorts
) {
  const appointment = await ports.getAppointment(context, appointmentId);

  if (!appointment) {
    throw new Error("Tenant-scoped appointment not found.");
  }

  assertTenantAccess(context, appointment);
  return appointment;
}

async function requirePatient(
  context: TenantContext,
  patientId: string,
  ports: RetentionLifecyclePorts
) {
  const patient = await ports.getPatient(context, patientId);

  if (!patient) {
    throw new Error("Tenant-scoped patient not found.");
  }

  assertTenantAccess(context, patient);
  return patient;
}

async function emitEvent(
  context: TenantContext,
  ports: RetentionLifecyclePorts,
  name: LifecycleEventName,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[]
) {
  await ports.emitLifecycleEvent(context, {
    name,
    entityType,
    entityId,
    payload,
    webhookSubscriptions
  });
}

async function emitState(
  context: TenantContext,
  ports: RetentionLifecyclePorts,
  transition: AppointmentTransitionResult,
  reason: LifecycleEventName,
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[]
) {
  await ports.emitStateChanged(context, {
    entityType: "appointment",
    entityId: transition.appointment.id,
    payload: {
      previousState: `${transition.previous.status}/${transition.previous.recoveryStatus}`,
      newState: `${transition.appointment.status}/${transition.appointment.recoveryStatus}`,
      reason
    },
    webhookSubscriptions
  });
}

async function auditTransition(
  context: TenantContext,
  ports: RetentionLifecyclePorts,
  transition: AppointmentTransitionResult,
  source: LifecycleEventName
) {
  await ports.recordAuditLog(context, {
    actorType: context.actor.type,
    actorId: context.actor.id,
    targetType: "appointment",
    targetId: transition.appointment.id,
    previousState: `${transition.previous.status}/${transition.previous.recoveryStatus}`,
    newState: `${transition.appointment.status}/${transition.appointment.recoveryStatus}`,
    source,
    correlationId: context.correlationId
  });
}

async function audit(
  context: TenantContext,
  ports: RetentionLifecyclePorts,
  targetId: string,
  newState: string,
  source: LifecycleEventName,
  targetType = "appointment"
) {
  await ports.recordAuditLog(context, {
    actorType: context.actor.type,
    actorId: context.actor.id,
    targetType,
    targetId,
    newState,
    source,
    correlationId: context.correlationId
  });
}
