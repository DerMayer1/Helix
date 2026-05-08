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

