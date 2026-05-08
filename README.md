# CareLoop

CareLoop is a multi-tenant retention orchestration platform for healthcare organizations. It models patient engagement as an event-driven operational lifecycle: appointment booking, reminders, confirmation, recovery workflows, post-care follow-up, prescription renewal, engagement scoring, LTV tracking, realtime dashboard updates, and webhook emission on state changes.

The project is intentionally built as a production-style backend architecture exercise, not a static demo or AI wrapper. The current implementation establishes the foundation for tenant-safe data access and queue-driven workflow orchestration.

## Current Status

Implemented stages:
- Phase 1: application foundation and architecture baseline.
- Phase 2: multi-tenant data core.
- Phase 3: event and queue orchestration foundation.
- Phase 4: appointment and reminder lifecycle.
- Phase 5: recovery and retention workflows.

Required verification:
- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Core Lifecycle

0. Tenant configures automation rules.
1. Patient books an appointment.
2. Reminder jobs are scheduled through BullMQ.
3. Queue state becomes visible in the dashboard.
4. Patient confirms and consultation happens.
5. AI summary is generated for the doctor.
6. Post-care sequence is auto-scheduled.
7. Or: patient fails confirmation.
8. Recovery workflow is triggered.
9. Engagement score updates live.
10. Dashboard updates in real time.
11. Prescription renewal is monitored.
12. Patient returns and LTV is updated.
13. Webhook is emitted on every state change.

## Technical Architecture

Frontend:
- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- Recharts for operational metrics

Backend:
- Next.js Route Handlers
- Drizzle ORM
- PostgreSQL
- Redis
- BullMQ
- Zod validation

Architecture boundaries:
- Tenant-owned data is scoped by `tenant_id`.
- Repositories require trusted server-side tenant context.
- PostgreSQL RLS is documented as the database enforcement layer.
- Events are persisted before queue fanout.
- Queue jobs use deterministic idempotency keys.
- Webhook payloads are signed, tenant-scoped, and PHI-minimized.
- AI behavior is assistive only and must not diagnose, prescribe, or make irreversible decisions.

## Implemented Foundation

Phase 1 established:
- Next.js application scaffold.
- TypeScript, ESLint, Tailwind, Vitest, and Drizzle configuration.
- Initial app shell.
- Canonical lifecycle event vocabulary.
- Baseline Drizzle schema.
- Redis and BullMQ lazy client setup.
- Architecture artifacts: `ARCHITECTURE.md`, `API_CONTRACTS.md`, `EVENT_SYSTEM.md`, and `STATE_MACHINES.md`.

Phase 2 established:
- Mocked tenant auth context.
- Tenant context validation.
- Tenant-scoped repository helpers.
- Core Zod validation schemas.
- Tenant-safe Drizzle repository functions.
- Audit log, lifecycle event, engagement score, and LTV persistence paths.
- Synthetic fixtures only.
- Tests proving cross-tenant reads and mutations are rejected at the repository-helper level.

Phase 3 established:
- Typed BullMQ payload contracts.
- Deterministic job IDs for reminders, recovery, follow-ups, engagement analysis, realtime events, and webhooks.
- Queue scheduling helpers with retry/backoff defaults.
- Queue visibility mapping for dashboard metrics.
- Lifecycle event emitter helpers.
- Webhook envelope minimization and HMAC signing.
- Worker processor foundations that validate payloads before execution.
- Tests for queue contracts, idempotency, scheduling, visibility, webhook signing, and PHI-minimized payloads.

Phase 4 established:
- Tenant-scoped route handlers for automation rules, patients, and appointments.
- Appointment booking orchestration that persists the appointment, schedules deterministic reminder jobs, emits queue/lifecycle/state events, records audit logs, and updates engagement score.
- Appointment creation rejects patient IDs that are not visible inside the current tenant context.
- Confirmation workflow that performs a tenant-scoped appointment transition and emits `patient.confirmed` plus `state.changed`.
- Unresponsive workflow entrypoint that marks recovery as `in_progress`, emits `patient.unresponsive` and `recovery.started`, records audit history, and increases churn risk.
- Reminder planning for the canonical `48h`, `24h`, `2h`, and `30m` offsets, with stale reminders skipped.
- Tests proving the Phase 4 lifecycle behavior and cross-tenant fanout rejection.

Phase 5 established:
- Recovery attempts that schedule deterministic BullMQ jobs and emit `recovery.attempted`.
- Recovery success/failure outcomes that emit `recovery.succeeded` or `recovery.failed`, transition appointment state, write audit logs, and update engagement score.
- Consultation completion that emits `consultation.completed`, schedules post-care follow-ups, emits `postcare.sequence_scheduled`, and records state/audit history.
- Prescription renewal monitoring that emits `prescription.expiring` and schedules prescription follow-up jobs.
- Patient return tracking that emits `patient.returned`, updates LTV, emits `ltv.updated`, and records retention-positive state.
- Tests proving recovery metrics, post-care scheduling, prescription monitoring, LTV update behavior, and cross-tenant fanout rejection.

## API Surface

The executable workflow is exposed through Next.js Route Handlers:

```text
GET  /api/automation-rules
POST /api/automation-rules
GET  /api/patients
POST /api/patients
GET  /api/appointments
POST /api/appointments
POST /api/appointments/:id/confirm
POST /api/appointments/:id/unresponsive
POST /api/appointments/:id/complete
POST /api/recovery/:appointmentId/attempt
POST /api/recovery/:appointmentId/succeed
POST /api/recovery/:appointmentId/fail
POST /api/patients/:id/prescription-expiring
POST /api/patients/:id/return
GET  /api/queues/visibility
```

These endpoints use server-side tenant context. Clients do not provide or control `tenantId`.

## Retention Workflow Map

Phase 5 turns retention into measurable backend behavior rather than a dashboard-only metric.

Core functions:
- `scheduleRecoveryAttemptLifecycle` schedules a deterministic recovery job, emits `recovery.attempted`, writes audit history, and moves engagement risk higher.
- `markRecoverySucceededLifecycle` records that recovery worked, transitions the appointment to `confirmed/succeeded`, emits `recovery.succeeded` and `state.changed`, and improves engagement score.
- `markRecoveryFailedLifecycle` records an exhausted recovery path, transitions the appointment to `no_show/failed`, emits `recovery.failed` and `state.changed`, and preserves the failure as an auditable metric.
- `completeConsultationLifecycle` transitions the appointment to `completed`, emits `consultation.completed`, schedules post-care follow-ups, emits `postcare.sequence_scheduled`, and updates engagement.
- `monitorPrescriptionRenewalLifecycle` turns a renewal risk into a scheduled prescription follow-up and emits `prescription.expiring`.
- `recordPatientReturnedLifecycle` records a retention-positive outcome, updates LTV using the canonical formula, emits `patient.returned` and `ltv.updated`, and moves the patient to a retained engagement state.

Purpose:
- Recovery rate is now computable from `recovery.attempted`, `recovery.succeeded`, and `recovery.failed`.
- Post-care work is queue-backed and idempotent instead of being implied by UI state.
- Prescription renewal is represented as a workflow signal, not a free-form note.
- LTV changes are tied to explicit return or renewal events.
- Every workflow is tenant-scoped, audit-backed, event-driven, and PHI-minimized.

## Event Vocabulary

Canonical lifecycle events include:
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

## LTV Formula

The MVP LTV model is intentionally simple and auditable:

```text
LTV = (consultations_completed * avg_revenue) + (prescriptions_renewed * renewal_value)
```

This is implemented in `src/domain/ltv.ts`.

## Security And Data Policy

CareLoop may eventually handle real patient data, so the engineering posture is strict by default:
- No real PHI in tests, fixtures, logs, prompts, screenshots, or public demos.
- Synthetic data is the default for local development.
- The frontend must not be trusted as a tenant boundary.
- Server-side tenant context is required for tenant-owned operations.
- Cross-tenant access is treated as a critical failure.
- Webhook payloads must be PHI-minimized and signed.
- The project must not claim HIPAA compliance until the legal, infrastructure, operational, and compliance requirements are actually complete.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run verification:

```bash
npm run typecheck
npm run lint
npm test
```

Run database tooling:

```bash
npm run db:generate
npm run db:migrate
```

## Contribution Standard

Use atomic, descriptive commits following Conventional Commits. See `CONTRIBUTING.md` for scopes, examples, review rules, and data-safety requirements.

## Repository Structure

```text
src/app                  Next.js App Router shell
src/domain               Pure domain contracts and calculations
src/server/appointments  Appointment booking, reminder planning, and lifecycle transitions
src/server/auth          Mocked tenant auth foundation
src/server/db            Drizzle schema and database client
src/server/events        Lifecycle event emitters
src/server/fixtures      Synthetic local/test data
src/server/observability Structured logging utilities
src/server/queues        BullMQ contracts, scheduling, visibility, processors
src/server/repositories  Tenant-scoped data access
src/server/retention     Recovery, post-care, prescription renewal, return, and LTV workflows
src/server/tenant        Tenant context and isolation helpers
src/server/validation    Zod input contracts
src/server/webhooks      Webhook envelopes and HMAC signing
```

## Technical Comment

The first five phases intentionally separate domain safety from workflow execution. Phase 2 makes tenant context and validation unavoidable before data access. Phase 3 places orchestration on top of that boundary through typed events, deterministic queue IDs, and signed webhook envelopes. Phase 4 connects that foundation to appointment booking, reminder scheduling, confirmation, recovery entrypoint, audit logs, and engagement scoring. Phase 5 makes retention measurable by turning recovery attempts, recovery outcomes, post-care scheduling, prescription renewal, patient return, and LTV updates into explicit events and audit trails. This prevents the common failure mode where queue workers, route handlers, and webhook dispatchers become parallel, less-secure paths around the main authorization and tenant-isolation model.

## Next Phase

Phase 6 should implement the AI clinical context layer:
- Doctor-facing consultation context generation.
- AI-assistive-only summaries with no diagnosis, prescribing, or irreversible actions.
- PHI-minimized context boundaries.
- AI fallback behavior and audit logs.
- Tests for prompt/context construction and safe failure behavior.
