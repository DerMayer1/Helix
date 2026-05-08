# Architecture - CareLoop

Status: Phase 1 baseline

CareLoop is a multi-tenant, event-driven retention orchestration system.

## Runtime Shape

- Next.js App Router for UI and route handlers
- PostgreSQL for durable tenant data
- Drizzle ORM for typed database access
- Redis and BullMQ for delayed and retryable workflows
- Server-Sent Events or WebSockets for live dashboard updates
- AI summarization as an assistive layer only

## Core Boundaries

- Tenant isolation is enforced server-side.
- Tenant-owned tables carry `tenant_id`.
- PostgreSQL RLS is required before production data is used.
- Expensive work runs in queues, not request handlers.
- State changes emit events, audit logs, dashboard updates, and webhooks when configured.
- PHI must not appear in logs, test fixtures, screenshots, AI prompts, or public demos.

## Phase 1 Deliverable

Phase 1 establishes the project structure, documentation contracts, domain event vocabulary, data schema foundation, lazy infrastructure clients, and static application shell.

## Phase 2 Deliverable

Phase 2 establishes the tenant-safe data core:
- tenant context is required for tenant-owned operations
- mocked tenant auth provides the temporary trusted tenant context
- Zod schemas validate core input contracts
- repositories scope reads and writes by server-side tenant context
- lifecycle events, audit logs, engagement scores, and LTV records have persistence paths
- tests prove cross-tenant records are not returned or mutated

## Phase 3 Deliverable

Phase 3 establishes the orchestration engine:
- lifecycle events can be persisted and mirrored into realtime queue jobs
- webhook jobs are scheduled from tenant subscriptions
- all queue payloads are validated with Zod contracts
- deterministic job IDs prevent duplicate reminder, recovery, follow-up, webhook, and realtime jobs
- queue visibility can feed dashboard metrics
- webhook payloads are signed and PHI-minimized
- worker processors validate job payloads before business execution

Webhook delivery attempts are represented by BullMQ jobs in this phase. Durable delivery-attempt tables can be added when outbound dispatch becomes a product-facing audit surface.
