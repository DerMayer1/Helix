export const dashboardSnapshot = {
  tenant: {
    name: "Northstar Care Group",
    region: "Midwest demo tenant",
    mode: "Synthetic data only"
  },
  generatedAt: "2026-05-08T16:40:00.000Z",
  workflowHealth: [
    { label: "Lifecycle events", value: "1,284", delta: "+18.6%" },
    { label: "Recovery rate", value: "47.2%", delta: "+6.4%" },
    { label: "Avg engagement", value: "76", delta: "+9 pts" },
    { label: "Tracked LTV", value: "$84.7k", delta: "+12.1%" }
  ],
  queues: [
    { name: "reminders", waiting: 18, active: 4, delayed: 112, failed: 1 },
    { name: "recovery", waiting: 7, active: 2, delayed: 31, failed: 0 },
    { name: "followups", waiting: 24, active: 5, delayed: 89, failed: 2 },
    { name: "ai-clinical-context", waiting: 3, active: 1, delayed: 8, failed: 0 },
    { name: "webhooks", waiting: 12, active: 3, delayed: 17, failed: 1 }
  ],
  lifecycle: [
    { step: "Automation configured", event: "automation.rules_configured", state: "ready", time: "08:10" },
    { step: "Appointment booked", event: "appointment.booked", state: "complete", time: "08:42" },
    { step: "Reminder jobs scheduled", event: "queue.job_scheduled", state: "complete", time: "08:43" },
    { step: "Confirmation pending", event: "patient.unresponsive", state: "watch", time: "10:21" },
    { step: "Recovery attempt sent", event: "recovery.attempted", state: "active", time: "10:24" },
    { step: "AI context generated", event: "consultation.context_generated", state: "safe", time: "11:05" },
    { step: "Post-care scheduled", event: "postcare.sequence_scheduled", state: "queued", time: "11:36" },
    { step: "LTV updated", event: "ltv.updated", state: "complete", time: "12:18" }
  ],
  recovery: {
    attempted: 212,
    succeeded: 100,
    failed: 38,
    inProgress: 74
  },
  patients: [
    {
      name: "Mara Velasquez",
      appointment: "Confirmed",
      recovery: "Succeeded",
      engagement: 88,
      churnRisk: "retained",
      ltv: "$1,920",
      ai: "generated"
    },
    {
      name: "Owen Kittredge",
      appointment: "Booked",
      recovery: "In progress",
      engagement: 41,
      churnRisk: "high",
      ltv: "$420",
      ai: "fallback"
    },
    {
      name: "Nikhil Ortez",
      appointment: "Completed",
      recovery: "Not started",
      engagement: 79,
      churnRisk: "retained",
      ltv: "$2,340",
      ai: "generated"
    },
    {
      name: "Selene Arroyo",
      appointment: "No show",
      recovery: "Failed",
      engagement: 22,
      churnRisk: "high",
      ltv: "$260",
      ai: "rejected"
    }
  ],
  aiContexts: [
    { appointmentId: "appt_0030", status: "generated", source: "guarded_ai", flags: 0 },
    { appointmentId: "appt_0041", status: "fallback", source: "fallback", flags: 1 },
    { appointmentId: "appt_0048", status: "rejected", source: "fallback", flags: 2 }
  ],
  webhookDeliveries: [
    { destination: "tenant.crm.retention", event: "state.changed", status: "delivered", latency: "184ms" },
    { destination: "analytics.recovery", event: "recovery.succeeded", status: "delivered", latency: "226ms" },
    { destination: "ops.timeline", event: "ltv.updated", status: "retrying", latency: "1.8s" }
  ],
  eventStream: [
    "appointment.booked",
    "queue.job_scheduled",
    "patient.unresponsive",
    "recovery.attempted",
    "recovery.succeeded",
    "consultation.context_generated",
    "postcare.sequence_scheduled",
    "patient.returned",
    "ltv.updated",
    "state.changed"
  ]
} as const;
