# API Contracts - CareLoop

Status: Phase 4 executable workflow
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

`POST /api/appointments` must persist the appointment, schedule reminder jobs, emit `queue.job_scheduled`, `appointment.booked`, and `state.changed`, write audit logs, and update engagement score.

Appointment creation must reject any `patientId` that is not visible inside the current server-side tenant context.

`POST /api/appointments/:id/confirm` must perform a tenant-scoped transition to `confirmed`, emit `patient.confirmed` and `state.changed`, write an audit log, and update engagement score.

`POST /api/appointments/:id/unresponsive` must set recovery status to `in_progress`, emit `patient.unresponsive`, `recovery.started`, and `state.changed`, write an audit log, and update engagement score.

### Recovery

Purpose:
- track recovery attempts and outcomes

Expected routes:
- `GET /api/recovery`
- `POST /api/recovery/:appointmentId/attempt`
- `POST /api/recovery/:appointmentId/succeed`
- `POST /api/recovery/:appointmentId/fail`

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
