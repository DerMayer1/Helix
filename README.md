# CareLoop

CareLoop is a multi-tenant retention orchestration platform for healthcare organizations.

The platform models patient engagement as an event-driven lifecycle:

1. Tenant configures automation rules.
2. Patient books an appointment.
3. Reminder jobs are scheduled through BullMQ.
4. Queue state is visible in the dashboard.
5. Confirmation leads to consultation, AI briefing, post-care scheduling, renewal monitoring, return visit, and LTV update.
6. Failed confirmation leads to recovery attempts, success/failure tracking, engagement score updates, dashboard metrics, and webhook emission.

## Phase 1 Deliverables

- Next.js App Router foundation
- TypeScript strict mode
- Tailwind configuration
- Drizzle/PostgreSQL schema foundation
- Redis/BullMQ lazy client foundation
- Canonical event vocabulary
- Required architecture artifacts
- Environment template

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Run verification:

```bash
npm run typecheck
npm run lint
npm test
```

If `npm audit fix --force` changes major framework packages, run `npm install` again after reviewing `package.json` so `package-lock.json` is regenerated from the intended dependency set.
