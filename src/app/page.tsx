import { Activity, Bell, Database, GitBranch, ShieldCheck, Webhook } from "lucide-react";
import { canonicalLifecycleEvents, canonicalLifecycleSteps } from "@/domain/events";

const foundations = [
  {
    label: "Tenant isolation",
    value: "RLS-ready",
    detail: "Tenant-owned tables carry tenant_id and are designed for PostgreSQL RLS.",
    icon: ShieldCheck
  },
  {
    label: "Queue orchestration",
    value: "BullMQ",
    detail: "Reminder, recovery, follow-up, webhook, and realtime queues are defined.",
    icon: Bell
  },
  {
    label: "Event system",
    value: "Typed vocabulary",
    detail: "Lifecycle events include recovery outcome signals and state.changed.",
    icon: GitBranch
  },
  {
    label: "Auditability",
    value: "State-first",
    detail: "State transitions are expected to emit events, audit records, and webhooks.",
    icon: Activity
  }
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">CareLoop / Phase 1</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
            Retention orchestration foundation
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            The project now has the baseline application shell, canonical event vocabulary,
            tenant-aware data model, queue categories, and architecture documents needed to
            start implementing the lifecycle.
          </p>
        </div>
        <div className="grid min-w-64 grid-cols-2 gap-3 rounded-md border border-border bg-panel p-4 shadow-sm">
          <div>
            <p className="text-xs text-muted">Stack</p>
            <p className="mt-1 font-mono text-sm">Next.js / TS</p>
          </div>
          <div>
            <p className="text-xs text-muted">Data</p>
            <p className="mt-1 font-mono text-sm">Postgres / Redis</p>
          </div>
          <div>
            <p className="text-xs text-muted">Queues</p>
            <p className="mt-1 font-mono text-sm">BullMQ</p>
          </div>
          <div>
            <p className="text-xs text-muted">State</p>
            <p className="mt-1 font-mono text-sm">Events</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {foundations.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-md border border-border bg-panel p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">{item.label}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{item.value}</h2>
                </div>
                <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{item.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-md border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Canonical lifecycle</p>
              <h2 className="mt-1 text-xl font-semibold">Operational sequence</h2>
            </div>
            <Database className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <ol className="mt-5 grid gap-2">
            {canonicalLifecycleSteps.map((step) => (
              <li key={step.order} className="grid grid-cols-[2.5rem_1fr] items-start gap-3 rounded-md border border-border/70 bg-background px-3 py-2">
                <span className="font-mono text-sm text-accent">{step.order}</span>
                <span className="text-sm leading-6">{step.label}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-md border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Event vocabulary</p>
              <h2 className="mt-1 text-xl font-semibold">Phase 1 contract</h2>
            </div>
            <Webhook className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-2">
            {canonicalLifecycleEvents.map((eventName) => (
              <code key={eventName} className="rounded border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground">
                {eventName}
              </code>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

