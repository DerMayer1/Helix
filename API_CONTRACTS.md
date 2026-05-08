# API Contracts - CareLoop

Status: Phase 1 baseline  
Owner: backend architecture

This document defines the initial API surface expected by the MVP.

## Contract Rules

Every endpoint must:
- validate input server-side
- validate tenant access server-side
- validate authorization server-side
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

### Appointments

Purpose:
- create appointments and drive lifecycle state transitions

Expected routes:
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/:id/confirm`
- `POST /api/appointments/:id/complete`
- `POST /api/appointments/:id/no-show`

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

### Webhooks

Purpose:
- configure and dispatch tenant-scoped state-change notifications

Expected routes:
- `GET /api/webhooks/subscriptions`
- `POST /api/webhooks/subscriptions`

Outbound webhooks must be HMAC-signed, idempotent, replay-safe, and PHI-minimized.

