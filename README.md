# Helix

## 1. What Helix is

Helix is a multi-tenant healthcare retention orchestration platform. It models patient engagement as an event-driven backend system: appointment booking, reminders, recovery workflows, post-care follow-up, prescription renewal, engagement scoring, LTV tracking, realtime dashboard updates, and tenant-scoped webhook dispatch.

The project is backend-first. The goal is to prove production-style architecture for healthcare SaaS workflows: tenant isolation, deterministic queues, typed events, auditability, PHI-minimized payloads, and operational lifecycle state.

## 2. Core workflow

```text
Tenant configures automation rules
        |
        v
Patient books appointment
        |
        v
appointment.booked + state.changed
        |
        v
BullMQ reminder jobs scheduled
        |
        v
Patient confirms? ---------------- no ----------------+
        |                                             |
       yes                                            v
        |                                  recovery.started
        v                                             |
Consultation completed                    recovery.attempted
        |                                             |
        v                                             v
AI clinical context generated      recovery.succeeded / recovery.failed
        |
        v
Post-care sequence scheduled
        |                                             |
        +--------------------+------------------------+
                             |
                             v
Engagement score updates
                             |
                             v
Prescription renewal monitored
                             |
                             v
Patient returns
                             |
                             v
LTV updated
                             |
                             v
Realtime dashboard + webhook dispatcher
```

Key events:
- `appointment.booked`
- `queue.job_scheduled`
- `patient.confirmed`
- `consultation.completed`
- `consultation.context_generated`
- `postcare.sequence_scheduled`
- `recovery.attempted`
- `recovery.succeeded`
- `recovery.failed`
- `prescription.expiring`
- `prescription.renewed`
- `patient.returned`
- `ltv.updated`
- `state.changed`

## 3. Architecture

```text
Next.js Route Handlers
        |
        v
Tenant Context Guard
        |
        v
Zod Input Contracts
        |
        v
Tenant-Scoped Repositories -----> PostgreSQL / Drizzle / RLS policy surface
        |
        v
Lifecycle Services
        |
        +--> Event Emitter -----> lifecycle_events table
        |         |
        |         +-----------> Realtime Queue
        |         |
        |         +-----------> Webhook Queue
        |
        +--> BullMQ Scheduler --> reminders / recovery / followups / ai-clinical-context
        |
        +--> Audit Log Writer --> audit_logs table
        |
        +--> Engagement + LTV --> engagement_scores / ltv_records
```

Visible backend entrypoints:
- `/workers`: BullMQ worker factories for AI context, reminders, recovery, and webhooks.
- `/queues`: queue contracts, idempotency, scheduling, processors, and visibility exports.
- `/events`: canonical lifecycle event vocabulary and event emitter exports.
- `/domain`: pure domain contracts and LTV calculation.
- `/lib/db`: database client and Drizzle schema exports.
- `/lib/tenant`: tenant context and isolation helpers.
- `/lib/webhooks`: webhook envelope and HMAC signing exports.

Core implementation modules:
- `src/server/appointments`: appointment booking, reminder planning, confirmation, and recovery entrypoint.
- `src/server/ai`: PHI-minimized clinical context builder, AI output guardrails, fallback behavior, and audit/event emission.
- `src/server/retention`: recovery attempts/outcomes, post-care scheduling, prescription renewal, patient return, and LTV updates.
- `src/server/repositories`: tenant-scoped data access.
- `src/server/queues`: BullMQ contracts and schedulers.
- `src/server/events`: persisted event emission and webhook fanout.

Structured event example:

```ts
type RecoveryAttemptedEvent = {
  event: "recovery.attempted";
  tenantId: string;
  entityType: "appointment";
  entityId: string;
  correlationId: string;
  timestamp: string;
  payload: {
    patientId: string;
    appointmentId: string;
    attempt: number;
    reason: "unconfirmed" | "no_show";
  };
};
```

## 4. Infrastructure highlights

Database:
- Drizzle schema with explicit enums for user roles, appointment status, recovery status, and AI context status.
- Tenant-owned tables include `tenant_id`.
- Indexes cover tenant lookups, tenant/entity events, tenant/patient records, and scheduled appointments.
- Audit logs record actor, tenant, target, previous state, new state, source, and correlation ID.
- AI clinical contexts are persisted with appointment ID, patient ID, status, source, summary, and safety flags.
- LTV uses the MVP formula: `(consultations_completed * avg_revenue) + (prescriptions_renewed * renewal_value)`.

Queues:
- BullMQ queues cover reminders, recovery, follow-ups, AI clinical context, engagement analysis, realtime events, and webhooks.
- Job IDs are deterministic to suppress duplicates.
- Retry/backoff defaults are centralized.
- Follow-up jobs include scheduled execution time and category-specific idempotency.

Workers:
- `workers/ai-context.worker.ts` handles queued AI clinical context generation.
- `workers/reminders.worker.ts` handles reminder jobs.
- `workers/recovery.worker.ts` handles recovery attempts.
- `workers/webhooks.worker.ts` handles webhook dispatch jobs.

Security posture:
- Tenant context is derived server-side.
- Frontend-provided `tenantId` is not trusted.
- Cross-tenant access is treated as a critical defect.
- AI context generation is assistive only and must not diagnose, prescribe, recommend dosage, or make irreversible decisions.
- AI prompts and outputs are guarded for PHI and unsafe clinical claims before persistence.
- Webhook payloads are signed and PHI-minimized.
- Tests, fixtures, logs, docs, screenshots, and public demos must use synthetic data.

## 5. Local setup

Install dependencies:

```bash
npm install
```

Run verification:

```bash
npm run typecheck
npm run lint
npm test
```

Run the app:

```bash
npm run dev
```

Run database tooling:

```bash
npm run db:generate
npm run db:migrate
```
