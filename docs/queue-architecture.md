# Queue Architecture

CareLoop uses BullMQ for healthcare retention workflows that require retry
guarantees, deterministic scheduling, and operational visibility.

```text
Lifecycle Event
      |
      v
Event Emitter --------------------------+
      |                                 |
      v                                 v
lifecycle_events table          Queue Scheduler
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
        v                               v                               v
   reminders                       recovery                       ai-context
        |                               |                               |
        v                               v                               v
 reminders.worker                recovery.worker                ai-context.worker
        |
        +-------------------------------+
                                        |
                                        v
                                   webhooks
                                        |
                                        v
                                webhooks.worker
```

| Queue | Worker | Retry | Idempotency Key |
| --- | --- | --- | --- |
| reminders | reminders.worker | 3x exponential | `reminder:{appointmentId}:{attempt}` |
| recovery | recovery.worker | 5x exponential | `recovery:{appointmentId}:{attempt}` |
| ai-context | ai-context.worker | 2x fixed | `ai-context:{consultationId}` |
| webhooks | webhooks.worker | 10x exponential | `webhook:{eventId}:{tenantId}` |

## Operating Rules

- Queue IDs must be deterministic so rescheduling the same workflow cannot
  create duplicate jobs.
- Worker payloads must contain tenant context and correlation IDs.
- Webhook jobs must use PHI-minimized payloads and HMAC signatures.
- Retry defaults live in shared queue contracts, not inside individual route
  handlers.
- Queue visibility is exposed through PHI-free operational snapshots.
