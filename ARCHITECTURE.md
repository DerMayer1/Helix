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

