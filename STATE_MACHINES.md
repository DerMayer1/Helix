# State Machines - CareLoop

Status: Phase 1 baseline  
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

## Webhook Delivery Lifecycle

States:
- `pending`
- `signed`
- `delivered`
- `retrying`
- `failed`
- `dead_lettered`

Webhook payloads must be tenant-scoped, signed, idempotent, replay-safe, and PHI-minimized.

