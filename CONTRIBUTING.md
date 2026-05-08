# Contributing

CareLoop is being built as a production-style engineering portfolio project. Contributions must preserve the architecture boundaries documented in `ARCHITECTURE.md`, `EVENT_SYSTEM.md`, `STATE_MACHINES.md`, and `API_CONTRACTS.md`.

## Commit Standard

Use atomic, descriptive commits. Each commit should represent one coherent engineering change that can be reviewed independently.

Commit messages should follow Conventional Commits:

```text
feat(queues): add deterministic job IDs for reminder scheduling
feat(tenant): implement cross-tenant rejection at repository layer
feat(webhooks): sign outbound state-change payloads
test(recovery): cover recovery outcome event contracts
docs(readme): document orchestration architecture
chore(tooling): update lint configuration
```

Avoid broad commits such as:

```text
update project
fix stuff
phase 4 changes
misc
```

## Commit Scope Guidance

Recommended scopes:
- `tenant`
- `db`
- `events`
- `queues`
- `webhooks`
- `recovery`
- `appointments`
- `dashboard`
- `ai`
- `docs`
- `tooling`
- `tests`

## Review Rules

Before committing, run:

```bash
npm run typecheck
npm run lint
npm test
```

Any change touching tenant isolation, PHI handling, authorization, audit logs, queue scheduling, lifecycle events, AI context generation, or webhook dispatch must include tests or a documented exception.

## Data Safety

Use synthetic data only. Do not commit real patient data, tenant data, screenshots containing identifiers, logs with PHI, secrets, or production exports.

