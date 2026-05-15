# Event System - CareLoop

Status: Phase 6 AI clinical context workflow, revalidated for CareLoop queue documentation
Owner: backend architecture

CareLoop is event-driven. Every business state transition emits `state.changed` and may emit a domain-specific event.

## Canonical Events

- `automation.rules_configured`
- `appointment.booked`
- `queue.job_scheduled`
- `queue.visible`
- `reminder.sent`
- `patient.confirmed`
- `patient.unresponsive`
- `patient.no_show`
- `consultation.completed`
- `consultation.context_generated`
- `postcare.sequence_scheduled`
- `followup.triggered`
- `retention.sequence_started`
- `recovery.started`
- `recovery.attempted`
- `recovery.succeeded`
- `recovery.failed`
- `prescription.expiring`
- `prescription.renewed`
- `exam.pending`
- `exam.completed`
- `engagement.score_changed`
- `patient.returned`
- `ltv.updated`
- `state.changed`

## Event Payload Requirements

Every event must include:
- `event_id`
- `tenant_id`
- `name`
- `entity_type`
- `entity_id`
- `occurred_at`
- `correlation_id`

Payloads must not include raw PHI unless the event contract explicitly requires it and the payload is protected by the relevant tenant authorization boundary.

## Producer Rules

Event producers must:
- validate tenant scope
- emit deterministic event names
- persist the event before outbound webhook dispatch
- create audit records for protected state changes

## Consumer Rules

Event consumers must:
- be idempotent
- validate payload shape
- avoid cross-tenant reads and writes
- define retry and dead-letter behavior
- log failures with structured context

## Phase 3 Runtime Rules

`emitLifecycleEvent` persists the domain event, schedules a realtime dashboard job, and schedules matching webhook jobs when tenant subscriptions include the emitted event name.

`emitStateChanged` is the canonical helper for lifecycle-wide state change notifications.

Outbound webhook jobs must use minimized payload envelopes and deterministic job IDs based on tenant, subscription, and event identity.

Phase 3 persists lifecycle events before queue fanout. Downstream queue jobs are retryable and idempotent, but delivery-attempt persistence remains a later hardening task.

## Phase 5 Retention Events

Recovery metrics are derived from discrete recovery events:
- `recovery.attempted` is emitted for each recovery outreach action.
- `recovery.succeeded` is emitted when the recovery path confirms, reschedules, or returns the patient.
- `recovery.failed` is emitted when the configured recovery sequence is exhausted without success.

Post-care and retention events are executable workflow outputs:
- `consultation.completed` transitions an appointment to completed.
- `postcare.sequence_scheduled` records the post-care follow-up plan.
- `prescription.expiring` schedules prescription renewal outreach.
- `prescription.renewed`, `patient.returned`, and `ltv.updated` record retention-positive outcomes.

Phase 5 event payloads remain tenant-scoped and PHI-minimized. Events identify patients and appointments by IDs only; no medical notes, histories, contact data, or raw clinical content is emitted.

Operational purpose:
- Recovery events are analytics primitives, not just notification messages.
- `queue.job_scheduled` links workflow decisions to BullMQ visibility.
- `state.changed` remains the lifecycle-wide integration event for dashboards and outbound webhooks.
- Retention-positive events make LTV explainable because every metric change can be traced back to a patient return, prescription renewal, or completed consultation.

## Phase 6 AI Events

`consultation.context_generated` is emitted after AI clinical context is generated, rejected, or replaced by fallback context.

AI event payloads must include:
- `patientId`
- `status`
- `source`
- `safetyFlags`

AI event payloads must not include:
- raw prompt text
- model output beyond persisted guarded summary references
- medical histories
- appointment notes
- contact data
- screenshots or public-demo data

Operational purpose:
- AI context generation becomes auditable without making AI output authoritative.
- `state.changed` lets the dashboard show that context was generated or safely downgraded.
- Safety flags make fallback and rejection behavior reviewable.
