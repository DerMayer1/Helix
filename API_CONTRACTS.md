# API Contracts - CareLoop

Status: Phase 5 retention workflow
Owner: backend architecture

This document defines the initial API surface expected by the MVP.

## Contract Rules

Every endpoint must:
- validate input server-side
- validate tenant access server-side
- validate authorization server-side
- derive `tenant_id` from trusted server-side context
- return typed responses
- return explicit error shapes
- log failures without PHI

## Initial API Groups

### Automation Rules

Purpose:
- configure tenant reminder timing, recovery behavior, post-care sequences, prescription renewal monitoring, and webhook subscriptions

Expected routes:
- `GET /api/automation-rules`
- `POST /api/automation-rules`
- `PATCH /api/automation-rules/:id`

Implemented in Phase 4:
- `GET /api/automation-rules`
- `POST /api/automation-rules`

### Patients

Purpose:
- create and list tenant-scoped synthetic patient records for appointment lifecycle execution

Implemented in Phase 4:
- `GET /api/patients`
- `POST /api/patients`

### Appointments

Purpose:
- create appointments and drive lifecycle state transitions

Expected routes:
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/:id/confirm`
- `POST /api/appointments/:id/complete`
- `POST /api/appointments/:id/no-show`
- `POST /api/appointments/:id/unresponsive`

Appointment writes must create or reference audit logs and lifecycle events through tenant-scoped repository functions.

Implemented in Phase 4:
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/:id/confirm`
- `POST /api/appointments/:id/unresponsive`

Implemented in Phase 5:
- `POST /api/appointments/:id/complete`

`POST /api/appointments` must persist the appointment, schedule reminder jobs, emit `queue.job_scheduled`, `appointment.booked`, and `state.changed`, write audit logs, and update engagement score.

Appointment creation must reject any `patientId` that is not visible inside the current server-side tenant context.

`POST /api/appointments/:id/confirm` must perform a tenant-scoped transition to `confirmed`, emit `patient.confirmed` and `state.changed`, write an audit log, and update engagement score.

`POST /api/appointments/:id/unresponsive` must set recovery status to `in_progress`, emit `patient.unresponsive`, `recovery.started`, and `state.changed`, write an audit log, and update engagement score.

`POST /api/appointments/:id/complete` must transition the appointment to `completed`, emit `consultation.completed`, schedule post-care follow-up jobs, emit `postcare.sequence_scheduled` and `state.changed`, write an audit log, and update engagement score.

### Recovery

Purpose:
- track recovery attempts and outcomes

Expected routes:
- `GET /api/recovery`
- `POST /api/recovery/:appointmentId/attempt`
- `POST /api/recovery/:appointmentId/succeed`
- `POST /api/recovery/:appointmentId/fail`

Implemented in Phase 5:
- `POST /api/recovery/:appointmentId/attempt`
- `POST /api/recovery/:appointmentId/succeed`
- `POST /api/recovery/:appointmentId/fail`

Recovery rate must be measurable from `recovery.attempted`, `recovery.succeeded`, and `recovery.failed`.

Recovery attempt writes must schedule deterministic BullMQ recovery jobs and emit `queue.job_scheduled` plus `recovery.attempted`.

Recovery outcome writes must transition tenant-scoped appointment state, emit `recovery.succeeded` or `recovery.failed`, emit `state.changed`, write audit logs, and update engagement score.

Implementation purpose:
- `scheduleRecoveryAttemptLifecycle` makes each outreach attempt countable and retryable.
- `markRecoverySucceededLifecycle` separates recovered patients from ordinary confirmations.
- `markRecoveryFailedLifecycle` gives operations a reliable denominator for recovery-rate reporting.

### Prescription Renewal

Purpose:
- monitor prescription renewal opportunities and schedule tenant-scoped follow-up jobs

Implemented in Phase 5:
- `POST /api/patients/:id/prescription-expiring`

Prescription expiry signals must emit `prescription.expiring`, schedule a prescription follow-up job, write an audit log, and update engagement score.

Implementation purpose:
- `monitorPrescriptionRenewalLifecycle` converts renewal risk into a queue-backed follow-up workflow.
- Follow-up job IDs include tenant, patient, appointment when available, sequence day, and category to prevent duplicate scheduling collisions.

### Realtime Metrics

Purpose:
- expose dashboard metrics and queue visibility

Expected routes:
- `GET /api/realtime/metrics`
- `GET /api/realtime/events`
- `GET /api/queues/visibility`

Realtime queue visibility must expose waiting, active, delayed, completed, failed, and paused counts for each core queue.

Implemented in Phase 4:
- `GET /api/queues/visibility`

### LTV Metrics

Purpose:
- store and expose tenant-scoped LTV evolution using the MVP formula

Expected routes:
- `GET /api/patients/:id/ltv`
- `PUT /api/patients/:id/ltv`
- `POST /api/patients/:id/return`

Implemented in Phase 5:
- `POST /api/patients/:id/return`

Patient return writes must emit `patient.returned`, update LTV, emit `ltv.updated`, emit `state.changed`, write an audit log, and update engagement score.

Implementation purpose:
- `recordPatientReturnedLifecycle` connects return visits and prescription renewals to the canonical LTV formula.
- The workflow emits IDs and numeric metrics only; it does not expose medical histories, notes, contact data, or other PHI in event payloads.

The MVP formula is `LTV = (consultations_completed * avg_revenue) + (prescriptions_renewed * renewal_value)`.

### Webhooks

Purpose:
- configure and dispatch tenant-scoped state-change notifications

Expected routes:
- `GET /api/webhooks/subscriptions`
- `POST /api/webhooks/subscriptions`

Outbound webhooks must be HMAC-signed, idempotent, replay-safe, and PHI-minimized.

Webhook headers:
- `x-careloop-timestamp`
- `x-careloop-signature`

Webhook signatures use HMAC-SHA256 over `{timestamp}.{body}`.
