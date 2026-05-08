# State Machines - CareLoop

Status: Phase 6 AI clinical context workflow
Owner: backend architecture

This document defines the initial workflow state machines required before implementing the lifecycle.

## Appointment Lifecycle

States:
- `booked`
- `confirmed`
- `completed`
- `cancelled`
- `no_show`

Allowed transitions:
- `booked -> confirmed` via `patient.confirmed`
- `booked -> cancelled` via staff/admin cancellation
- `booked -> no_show` via missed appointment detection
- `confirmed -> completed` via consultation completion
- `confirmed -> cancelled` via staff/admin cancellation

Every transition must:
- validate tenant access
- validate actor authorization
- create an audit log
- emit `state.changed`
- emit a domain-specific event
- enqueue webhooks when tenant subscriptions match the event

## Recovery Lifecycle

States:
- `not_started`
- `in_progress`
- `succeeded`
- `failed`

Allowed transitions:
- `not_started -> in_progress` via `recovery.started`
- `in_progress -> in_progress` via `recovery.attempted`
- `in_progress -> succeeded` via `recovery.succeeded`
- `in_progress -> failed` via `recovery.failed`

Recovery attempts must be discrete events so recovery rate can be audited and shown in the dashboard.

## Queue Job Lifecycle

States:
- `scheduled`
- `active`
- `completed`
- `retrying`
- `dead_lettered`
- `cancelled`

Queue jobs must use stable idempotency keys, bounded retries, backoff, and structured failure logs.

Phase 5 queue contracts:
- reminders use appointment and offset identity
- recovery jobs use appointment and attempt identity
- follow-up jobs use patient, appointment when available, sequence-day, and category identity
- AI clinical context jobs use tenant, appointment, and mode identity
- webhook jobs use subscription and event identity
- realtime jobs use event identity

## Retention Lifecycle

Retention-positive states are modeled through events rather than a separate patient status table in the current implementation.

Retention signals:
- `consultation.completed` schedules post-care follow-up.
- `prescription.expiring` schedules renewal outreach.
- `prescription.renewed` records a renewal-positive event.
- `patient.returned` records a return visit or equivalent retention outcome.
- `ltv.updated` persists the updated LTV calculation.

Every retention-positive write must:
- validate tenant access
- create an audit log
- update engagement score
- emit the domain event
- emit `state.changed` when the patient or appointment state changes

Implementation purpose:
- Appointment state tracks clinical/operational progress.
- Recovery state tracks whether failed confirmation was recovered, exhausted, or still in progress.
- Retention events track downstream value creation without adding premature patient-status tables.
- Queue state tracks work that has been scheduled but not yet executed.

## Webhook Delivery Lifecycle

States:
- `pending`
- `signed`
- `delivered`
- `retrying`
- `failed`
- `dead_lettered`

Webhook payloads must be tenant-scoped, signed, idempotent, replay-safe, and PHI-minimized.

## AI Clinical Context Lifecycle

States:
- `generated`
- `fallback`
- `rejected`

Allowed outcomes:
- `generated` when prompt and output pass safety checks
- `fallback` when the provider fails or no compliant provider path is available
- `rejected` when prompt or output safety checks fail

Every AI context write must:
- validate tenant access
- avoid PHI-bearing prompt construction
- reject diagnosis, prescribing, dosage, and irreversible-decision language
- persist safety flags
- create an audit log
- emit `consultation.context_generated`
- emit `state.changed`
