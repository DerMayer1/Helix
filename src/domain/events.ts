export const canonicalLifecycleSteps = [
  { order: 0, label: "Tenant configures automation rules" },
  { order: 1, label: "Patient books appointment" },
  { order: 2, label: "Reminder jobs scheduled through BullMQ" },
  { order: 3, label: "Queue state becomes visible in the dashboard" },
  { order: 4, label: "Patient confirms and consultation happens" },
  { order: 5, label: "AI summary is generated for the doctor" },
  { order: 6, label: "Post-care sequence is auto-scheduled" },
  { order: 7, label: "Or: patient fails confirmation" },
  { order: 8, label: "Recovery workflow is triggered" },
  { order: 9, label: "Engagement score updates live" },
  { order: 10, label: "Dashboard updates in real time" },
  { order: 11, label: "Prescription renewal is monitored" },
  { order: 12, label: "Patient returns and LTV is updated" },
  { order: 13, label: "Webhook is emitted on every state change" }
] as const;

export const canonicalLifecycleEvents = [
  "automation.rules_configured",
  "appointment.booked",
  "queue.job_scheduled",
  "queue.visible",
  "reminder.sent",
  "patient.confirmed",
  "patient.unresponsive",
  "patient.no_show",
  "consultation.completed",
  "consultation.context_generated",
  "postcare.sequence_scheduled",
  "followup.triggered",
  "retention.sequence_started",
  "recovery.started",
  "recovery.attempted",
  "recovery.succeeded",
  "recovery.failed",
  "prescription.expiring",
  "prescription.renewed",
  "exam.pending",
  "exam.completed",
  "engagement.score_changed",
  "patient.returned",
  "ltv.updated",
  "state.changed"
] as const;

export type LifecycleEventName = (typeof canonicalLifecycleEvents)[number];

export type BaseLifecycleEvent<TName extends LifecycleEventName, TPayload extends object> = {
  event: TName;
  tenantId: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  timestamp: string;
  payload: TPayload;
};

export type AppointmentBookedEvent = BaseLifecycleEvent<"appointment.booked", {
  patientId: string;
  appointmentId: string;
  scheduledAt: string;
  remindersScheduled: number;
}>;

export type RecoveryAttemptedEvent = BaseLifecycleEvent<"recovery.attempted", {
  patientId: string;
  appointmentId: string;
  attempt: number;
  reason: "unconfirmed" | "no_show";
}>;

export type RecoverySucceededEvent = BaseLifecycleEvent<"recovery.succeeded", {
  patientId: string;
  appointmentId: string;
  outcomeReason: string;
}>;

export type RecoveryFailedEvent = BaseLifecycleEvent<"recovery.failed", {
  patientId: string;
  appointmentId: string;
  outcomeReason: string;
}>;

export type ConsultationContextGeneratedEvent = BaseLifecycleEvent<"consultation.context_generated", {
  patientId: string;
  appointmentId: string;
  status: "generated" | "fallback" | "rejected";
  source: "deterministic" | "guarded_ai" | "fallback";
  safetyFlags: Record<string, unknown>;
}>;

export type PatientReturnedEvent = BaseLifecycleEvent<"patient.returned", {
  patientId: string;
  source: "return_visit" | "prescription_renewal" | "postcare_engagement";
}>;

export type LtvUpdatedEvent = BaseLifecycleEvent<"ltv.updated", {
  patientId: string;
  consultationsCompleted: number;
  prescriptionsRenewed: number;
  source: "return_visit" | "prescription_renewal" | "postcare_engagement";
}>;

export type StateChangedEvent = BaseLifecycleEvent<"state.changed", {
  previousState: string | null;
  newState: string;
  reason: LifecycleEventName;
}>;

export type CareLoopLifecycleEvent =
  | AppointmentBookedEvent
  | RecoveryAttemptedEvent
  | RecoverySucceededEvent
  | RecoveryFailedEvent
  | ConsultationContextGeneratedEvent
  | PatientReturnedEvent
  | LtvUpdatedEvent
  | StateChangedEvent;
