# CareLoop

CareLoop is a multi-tenant retention orchestration platform for healthcare organizations. It models patient engagement as an event-driven operational lifecycle: appointment booking, reminders, confirmation, recovery workflows, post-care follow-up, prescription renewal, engagement scoring, LTV tracking, realtime dashboard updates, and webhook emission on state changes.

The project is intentionally built as a production-style backend architecture exercise, not a static demo or AI wrapper. The current implementation establishes the foundation for tenant-safe data access and queue-driven workflow orchestration.

## Current Status

Implemented stages:
- Phase 1: application foundation and architecture baseline.
- Phase 2: multi-tenant data core.
- Phase 3: event and queue orchestration foundation.

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

## Repository Structure

```text
src/app                  Next.js App Router shell
src/domain               Pure domain contracts and calculations
src/server/auth          Mocked tenant auth foundation
src/server/db            Drizzle schema and database client
src/server/events        Lifecycle event emitters
src/server/fixtures      Synthetic local/test data
src/server/observability Structured logging utilities
src/server/queues        BullMQ contracts, scheduling, visibility, processors
src/server/repositories  Tenant-scoped data access
src/server/tenant        Tenant context and isolation helpers
src/server/validation    Zod input contracts
src/server/webhooks      Webhook envelopes and HMAC signing
```

## Technical Comment

The first three phases intentionally separate domain safety from workflow execution. Phase 2 makes tenant context and validation unavoidable before data access. Phase 3 then places orchestration on top of that boundary through typed events, deterministic queue IDs, and signed webhook envelopes. This prevents the common failure mode where queue workers and webhook dispatchers become parallel, less-secure paths around the main authorization and tenant-isolation model.

## Next Phase

Phase 4 should implement the first complete product workflow:
- Tenant configures automation rules.
- Patient appointment is created.
- Reminder jobs are scheduled.
- Queue state appears in the dashboard.
- Patient confirmation or non-response drives the next state transition.
- Lifecycle events and webhooks are emitted from real application behavior.
