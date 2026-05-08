# Event System - CareLoop

Status: Phase 1 baseline  
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

