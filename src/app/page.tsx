import { dashboardSnapshot } from "@/server/fixtures/dashboard";

const stateStyles: Record<string, string> = {
  active: "border-cyan-700/20 bg-cyan-700/10 text-cyan-900",
  complete: "border-emerald-700/20 bg-emerald-700/10 text-emerald-900",
  delivered: "border-emerald-700/20 bg-emerald-700/10 text-emerald-900",
  fallback: "border-amber-700/20 bg-amber-700/10 text-amber-900",
  failed: "border-rose-700/20 bg-rose-700/10 text-rose-900",
  generated: "border-emerald-700/20 bg-emerald-700/10 text-emerald-900",
  high: "border-rose-700/20 bg-rose-700/10 text-rose-900",
  queued: "border-slate-700/20 bg-slate-700/10 text-slate-900",
  ready: "border-cyan-700/20 bg-cyan-700/10 text-cyan-900",
  rejected: "border-rose-700/20 bg-rose-700/10 text-rose-900",
  retained: "border-emerald-700/20 bg-emerald-700/10 text-emerald-900",
  retrying: "border-amber-700/20 bg-amber-700/10 text-amber-900",
  safe: "border-emerald-700/20 bg-emerald-700/10 text-emerald-900",
  watch: "border-amber-700/20 bg-amber-700/10 text-amber-900"
};

function statusClass(value: string) {
  return stateStyles[value.toLowerCase()] ?? "border-slate-700/20 bg-slate-700/10 text-slate-900";
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] ${statusClass(value)}`}>
      {value}
    </span>
  );
}

function MetricBlock({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="phase-reveal border-l border-slate-300/80 pl-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-end gap-3">
        <p className="font-mono text-3xl tracking-[-0.08em] text-slate-950 md:text-4xl">{value}</p>
        <p className="pb-1 font-mono text-xs text-cyan-800">{delta}</p>
      </div>
    </div>
  );
}

function QueueRow({ queue }: { queue: (typeof dashboardSnapshot.queues)[number] }) {
  const load = queue.waiting + queue.active + queue.delayed;
  return (
    <div className="grid grid-cols-[1fr_auto] gap-5 border-t border-slate-200 py-4 first:border-t-0">
      <div>
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-cyan-700 shadow-[0_0_0_4px_rgba(14,116,144,0.09)]" />
          <p className="font-mono text-sm text-slate-950">{queue.name}</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-cyan-800"
            style={{ width: `${Math.min(load, 140) / 1.4}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 text-right font-mono text-xs text-slate-600">
        <span>{queue.waiting} wait</span>
        <span>{queue.active} live</span>
        <span>{queue.delayed} delay</span>
        <span>{queue.failed} fail</span>
      </div>
    </div>
  );
}

function FlowRail() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-cyan-800" />
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-900">backend flow</p>
      <div className="mt-8 grid gap-4 text-sm text-slate-700">
        {[
          "Route Handler",
          "Tenant Guard",
          "Lifecycle Service",
          "Event Emitter",
          "BullMQ Worker",
          "Audit Log",
          "Realtime Dashboard",
          "Webhook Dispatcher"
        ].map((item, index) => (
          <div key={item} className="grid grid-cols-[2rem_1fr] items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 font-mono text-xs text-slate-700">
              {index + 1}
            </span>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              {item}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecoveryPanel() {
  const { recovery } = dashboardSnapshot;
  const total = recovery.attempted;
  const succeeded = Math.round((recovery.succeeded / total) * 100);
  const failed = Math.round((recovery.failed / total) * 100);
  const progress = Math.round((recovery.inProgress / total) * 100);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">recovery engine</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Recovery rate is event-derived</h2>
        </div>
        <p className="font-mono text-4xl tracking-[-0.08em] text-cyan-900">47.2%</p>
      </div>
      <div className="mt-7 grid gap-3">
        {[
          ["succeeded", succeeded, recovery.succeeded],
          ["in progress", progress, recovery.inProgress],
          ["failed", failed, recovery.failed]
        ].map(([label, percent, count]) => (
          <div key={label.toString()}>
            <div className="mb-2 flex justify-between font-mono text-xs text-slate-600">
              <span>{label}</span>
              <span>{count} events</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-cyan-800" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PatientTable() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">tenant patients</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Engagement, recovery and LTV</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="text-left font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">patient</th>
              <th className="px-6 py-4 font-medium">appointment</th>
              <th className="px-6 py-4 font-medium">recovery</th>
              <th className="px-6 py-4 font-medium">risk</th>
              <th className="px-6 py-4 text-right font-medium">score</th>
              <th className="px-6 py-4 text-right font-medium">ltv</th>
              <th className="px-6 py-4 font-medium">ai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {dashboardSnapshot.patients.map((patient) => (
              <tr key={patient.name} className="transition-colors hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-950">{patient.name}</td>
                <td className="px-6 py-4 text-slate-600">{patient.appointment}</td>
                <td className="px-6 py-4 text-slate-600">{patient.recovery}</td>
                <td className="px-6 py-4"><StatusPill value={patient.churnRisk} /></td>
                <td className="px-6 py-4 text-right font-mono text-slate-950">{patient.engagement}</td>
                <td className="px-6 py-4 text-right font-mono text-slate-950">{patient.ltv}</td>
                <td className="px-6 py-4"><StatusPill value={patient.ai} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AiAndWebhookPanel() {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">ai context</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Assistive-only guardrails</h2>
        <div className="mt-6 divide-y divide-slate-200">
          {dashboardSnapshot.aiContexts.map((context) => (
            <div key={context.appointmentId} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-mono text-sm text-slate-950">{context.appointmentId}</p>
                <p className="mt-1 text-xs text-slate-500">{context.source} / {context.flags} flags</p>
              </div>
              <StatusPill value={context.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.8)]">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-200">webhook dispatcher</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Signed tenant callbacks</h2>
        <div className="mt-6 divide-y divide-white/10">
          {dashboardSnapshot.webhookDeliveries.map((delivery) => (
            <div key={`${delivery.destination}-${delivery.event}`} className="grid gap-2 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-mono text-sm">{delivery.destination}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">{delivery.event}</p>
              </div>
              <div className="flex items-center gap-3 md:justify-end">
                <span className="font-mono text-xs text-slate-400">{delivery.latency}</span>
                <span className={`rounded-full border px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] ${delivery.status === "retrying" ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>
                  {delivery.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LifecycleTimeline() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">event spine</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Live lifecycle trace</h2>
        </div>
        <StatusPill value="synthetic data" />
      </div>
      <div className="mt-6 grid gap-3">
        {dashboardSnapshot.lifecycle.map((item, index) => (
          <div key={`${item.event}-${item.time}`} className="phase-reveal grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-t border-slate-200 py-4 first:border-t-0" style={{ animationDelay: `${index * 55}ms` }}>
            <span className="font-mono text-xs text-slate-500">{item.time}</span>
            <div>
              <p className="text-sm font-medium text-slate-950">{item.step}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{item.event}</p>
            </div>
            <StatusPill value={item.state} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[rgb(var(--background))] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(14,116,144,0.14),transparent_28%),radial-gradient(circle_at_88%_4%,rgba(15,23,42,0.10),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(90deg,#0f172a_1px,transparent_1px),linear-gradient(#0f172a_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
        <header className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-800/20 bg-cyan-800/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.22em] text-cyan-900">Helix</span>
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">{dashboardSnapshot.tenant.mode}</span>
            </div>
            <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[0.95] tracking-[-0.08em] text-slate-950 md:text-6xl">
              Healthcare retention cockpit for event-driven operations.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Appointment lifecycle, BullMQ queues, recovery workflows, AI context safety, LTV movement, and webhook delivery in one operational surface. No real PHI is used.
            </p>
          </div>
          <FlowRail />
        </header>

        <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white/70 p-6 backdrop-blur md:grid-cols-2 lg:grid-cols-4">
          {dashboardSnapshot.workflowHealth.map((metric) => (
            <MetricBlock key={metric.label} {...metric} />
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <LifecycleTimeline />
          <div className="grid gap-5">
            <RecoveryPanel />
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">queue visibility</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Workers with deterministic jobs</h2>
              <div className="mt-5">
                {dashboardSnapshot.queues.map((queue) => (
                  <QueueRow key={queue.name} queue={queue} />
                ))}
              </div>
            </section>
          </div>
        </section>

        <AiAndWebhookPanel />
        <PatientTable />

        <section className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">event stream</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Persisted vocabulary shown in UI</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-600">
              The frontend is intentionally wired to the same canonical workflow vocabulary used by the backend.
            </p>
          </div>
          <div className="mt-6 flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 py-3">
            <div className="event-marquee flex shrink-0 gap-3 px-3">
              {[...dashboardSnapshot.eventStream, ...dashboardSnapshot.eventStream].map((eventName, index) => (
                <code key={`${eventName}-${index}`} className="rounded-full border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                  {eventName}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
