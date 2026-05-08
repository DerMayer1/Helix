"use client";

import { useMemo, useState, type ReactNode } from "react";

type SectionId =
  | "dashboard"
  | "recovery"
  | "automation"
  | "patients"
  | "briefing"
  | "events"
  | "settings";

type PatientState = "confirmed" | "at-risk" | "no-show" | "recovered" | "churned";
type WebhookState = "pending" | "delivered" | "failed" | "emitted";
type ContextStatus = "GENERATED" | "FALLBACK" | "REJECTED" | "PENDING";

type Patient = {
  id: string;
  name: string;
  state: PatientState;
  engagement: number;
  churnRisk: "low" | "medium" | "high" | "critical";
  ltv: number;
  ltvDelta: number;
  appointment: string;
  appointmentType: string;
  lastInteraction: string;
  nextAction: string;
  aiStatus: ContextStatus;
};

type RecoveryCase = {
  id: string;
  patientId: string;
  patientName: string;
  appointmentTime: string;
  attempts: number;
  state: PatientState;
  stage: "Unconfirmed" | "No-Show Risk" | "Active Recovery" | "Resolved";
  lastContact: string;
  nextAction: string;
};

type LifecycleEvent = {
  id: string;
  time: string;
  type: string;
  patientId: string;
  tenantId: string;
  webhook: WebhookState;
  payload: Record<string, string | number | boolean>;
};

type ReminderRule = {
  id: string;
  offset: string;
  channel: "email" | "sms" | "push";
  template: string;
  enabled: boolean;
};

const tenant = {
  name: "Northstar Care Group",
  id: "tenant_clp_northstar_001",
  plan: "Enterprise Pilot",
  isolation: "RLS enforced"
};

const navItems: Array<{ id: SectionId; label: string; meta: string }> = [
  { id: "dashboard", label: "Dashboard", meta: "LIVE OPS" },
  { id: "recovery", label: "Recovery Inbox", meta: "QUEUES" },
  { id: "automation", label: "Automation Builder", meta: "RULES" },
  { id: "patients", label: "Patients", meta: "PROFILES" },
  { id: "briefing", label: "Physician Briefing", meta: "AI-SAFE" },
  { id: "events", label: "Events", meta: "AUDIT" },
  { id: "settings", label: "Settings", meta: "TENANT" }
];

const initialPatients: Patient[] = [
  {
    id: "pat_syn_1042",
    name: "Mara Ellison",
    state: "at-risk",
    engagement: 54,
    churnRisk: "high",
    ltv: 1820,
    ltvDelta: 320,
    appointment: "Today 14:30",
    appointmentType: "Dermatology follow-up",
    lastInteraction: "SMS reminder ignored 18m ago",
    nextAction: "Recovery attempt in 12m",
    aiStatus: "PENDING"
  },
  {
    id: "pat_syn_1187",
    name: "Theo Martin",
    state: "confirmed",
    engagement: 83,
    churnRisk: "low",
    ltv: 2470,
    ltvDelta: 410,
    appointment: "Today 15:10",
    appointmentType: "Prescription renewal",
    lastInteraction: "Confirmed by email 9m ago",
    nextAction: "Generate physician briefing",
    aiStatus: "GENERATED"
  },
  {
    id: "pat_syn_1299",
    name: "Nina Calder",
    state: "no-show",
    engagement: 31,
    churnRisk: "critical",
    ltv: 920,
    ltvDelta: -180,
    appointment: "Today 11:00",
    appointmentType: "Post-care review",
    lastInteraction: "No response after 3 attempts",
    nextAction: "Escalate recovery sequence",
    aiStatus: "FALLBACK"
  },
  {
    id: "pat_syn_1334",
    name: "Jonas Bell",
    state: "recovered",
    engagement: 72,
    churnRisk: "medium",
    ltv: 3110,
    ltvDelta: 760,
    appointment: "Tomorrow 09:20",
    appointmentType: "Return consultation",
    lastInteraction: "Rescheduled through recovery call",
    nextAction: "Send D-1 confirmation",
    aiStatus: "GENERATED"
  },
  {
    id: "pat_syn_1418",
    name: "Elena Ford",
    state: "churned",
    engagement: 18,
    churnRisk: "critical",
    ltv: 640,
    ltvDelta: -420,
    appointment: "None scheduled",
    appointmentType: "Retention outreach",
    lastInteraction: "Recovery failed after max attempts",
    nextAction: "Suppress reminder storm",
    aiStatus: "REJECTED"
  }
];

const initialRecoveryCases: RecoveryCase[] = [
  {
    id: "rec_701",
    patientId: "pat_syn_1042",
    patientName: "Mara Ellison",
    appointmentTime: "Today 14:30",
    attempts: 2,
    state: "at-risk",
    stage: "Active Recovery",
    lastContact: "SMS failed 18m ago",
    nextAction: "Call attempt"
  },
  {
    id: "rec_702",
    patientId: "pat_syn_1299",
    patientName: "Nina Calder",
    appointmentTime: "Today 11:00",
    attempts: 3,
    state: "no-show",
    stage: "No-Show Risk",
    lastContact: "Email opened 43m ago",
    nextAction: "Mark outcome"
  },
  {
    id: "rec_703",
    patientId: "pat_syn_1334",
    patientName: "Jonas Bell",
    appointmentTime: "Tomorrow 09:20",
    attempts: 1,
    state: "recovered",
    stage: "Resolved",
    lastContact: "Phone confirmed 7m ago",
    nextAction: "Post-care sequence"
  },
  {
    id: "rec_704",
    patientId: "pat_syn_1510",
    patientName: "Priya Moss",
    appointmentTime: "Today 16:45",
    attempts: 0,
    state: "at-risk",
    stage: "Unconfirmed",
    lastContact: "48h reminder delivered",
    nextAction: "24h reminder"
  }
];

const initialEvents: LifecycleEvent[] = [
  {
    id: "evt_9007",
    time: "13:44:12",
    type: "recovery.attempted",
    patientId: "pat_syn_1042",
    tenantId: tenant.id,
    webhook: "pending",
    payload: { channel: "sms", attempt: 2, idempotencyKey: "rec_701_attempt_2" }
  },
  {
    id: "evt_9006",
    time: "13:41:03",
    type: "queue.job_scheduled",
    patientId: "pat_syn_1187",
    tenantId: tenant.id,
    webhook: "delivered",
    payload: { queue: "reminders", delayMinutes: 120, jobId: "bull_rem_1187_2h" }
  },
  {
    id: "evt_9005",
    time: "13:36:27",
    type: "ai.context_generated",
    patientId: "pat_syn_1187",
    tenantId: tenant.id,
    webhook: "emitted",
    payload: { status: "generated", source: "guarded_ai", phiFree: true }
  },
  {
    id: "evt_9004",
    time: "13:31:49",
    type: "recovery.succeeded",
    patientId: "pat_syn_1334",
    tenantId: tenant.id,
    webhook: "delivered",
    payload: { outcome: "rescheduled", attempts: 1, ltvDelta: 760 }
  },
  {
    id: "evt_9003",
    time: "13:22:14",
    type: "appointment.booked",
    patientId: "pat_syn_1042",
    tenantId: tenant.id,
    webhook: "delivered",
    payload: { appointmentId: "apt_syn_8110", source: "tenant_portal" }
  },
  {
    id: "evt_9002",
    time: "13:17:02",
    type: "ltv.updated",
    patientId: "pat_syn_1334",
    tenantId: tenant.id,
    webhook: "failed",
    payload: { previous: 2350, current: 3110, reason: "patient.returned" }
  }
];

const eventTypes = [
  "all",
  "appointment.booked",
  "queue.job_scheduled",
  "recovery.attempted",
  "recovery.succeeded",
  "ai.context_generated",
  "ltv.updated"
];

const pipeline = [
  "Route Handler",
  "Tenant Guard",
  "Lifecycle Service",
  "Event Emitter",
  "BullMQ Worker",
  "Audit Log",
  "Realtime Dashboard",
  "Webhook Dispatcher"
];

const baseReminderRules: ReminderRule[] = [
  { id: "rem_48h", offset: "48h", channel: "email", template: "confirmation_48h", enabled: true },
  { id: "rem_24h", offset: "24h", channel: "sms", template: "confirmation_24h", enabled: true },
  { id: "rem_2h", offset: "2h", channel: "push", template: "arrival_2h", enabled: true },
  { id: "rem_30m", offset: "30min", channel: "sms", template: "arrival_30m", enabled: false }
];

const stateTone: Record<PatientState, string> = {
  confirmed: "border-teal-300/40 bg-teal-300/10 text-teal-100",
  "at-risk": "border-amber-300/45 bg-amber-300/10 text-amber-100",
  "no-show": "border-red-300/45 bg-red-400/10 text-red-100",
  recovered: "border-green-300/45 bg-green-300/10 text-green-100",
  churned: "border-slate-300/25 bg-slate-300/10 text-slate-200"
};

const webhookTone: Record<WebhookState, string> = {
  pending: "border-amber-300/45 bg-amber-300/10 text-amber-100",
  delivered: "border-green-300/45 bg-green-300/10 text-green-100",
  failed: "border-red-300/45 bg-red-400/10 text-red-100",
  emitted: "border-teal-300/45 bg-teal-300/10 text-teal-100"
};

const aiTone: Record<ContextStatus, string> = {
  GENERATED: "border-teal-300/45 bg-teal-300/10 text-teal-100",
  FALLBACK: "border-amber-300/45 bg-amber-300/10 text-amber-100",
  REJECTED: "border-red-300/45 bg-red-400/10 text-red-100",
  PENDING: "border-slate-300/25 bg-slate-300/10 text-slate-200"
};

export default function CareLoopCockpit() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [patients, setPatients] = useState(initialPatients);
  const [recoveryCases, setRecoveryCases] = useState(initialRecoveryCases);
  const [events, setEvents] = useState(initialEvents);
  const [activeRecoveryTab, setActiveRecoveryTab] = useState("Active Recovery");
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatients[0].id);
  const [patientTab, setPatientTab] = useState("Timeline");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState("all");
  const [patientFilter, setPatientFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [reminderRules, setReminderRules] = useState(baseReminderRules);
  const [webhookEndpoint, setWebhookEndpoint] = useState("https://ops.northstar.example/webhooks/careloop");
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [ruleMessage, setRuleMessage] = useState("Last saved 13:42:10 UTC with signed webhook subscriptions.");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiKey, setApiKey] = useState("clp_live_syn_7f4...91c");
  const [copyState, setCopyState] = useState("Copy");

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];

  const filteredRecoveryCases = recoveryCases.filter((item) => item.stage === activeRecoveryTab);
  const filteredEvents = events.filter((event) => {
    const typeMatches = eventFilter === "all" || event.type === eventFilter;
    const patientMatches = patientFilter.length === 0 || event.patientId.includes(patientFilter);
    const dateMatches = dateFilter.length === 0 || event.time.startsWith(dateFilter);

    return typeMatches && patientMatches && dateMatches;
  });

  const metrics = useMemo(() => {
    const avgEngagement = Math.round(
      patients.reduce((total, patient) => total + patient.engagement, 0) / patients.length
    );
    const trackedLtv = patients.reduce((total, patient) => total + patient.ltv, 0);
    const recovered = recoveryCases.filter((item) => item.state === "recovered").length;
    const attempted = recoveryCases.filter((item) => item.attempts > 0).length || 1;

    return {
      lifecycleEvents: events.length + 132,
      recoveryRate: Math.round((recovered / attempted) * 100),
      avgEngagement,
      trackedLtv
    };
  }, [events.length, patients, recoveryCases]);

  function appendEvent(type: string, patientId: string, webhook: WebhookState, payload: LifecycleEvent["payload"]) {
    const event: LifecycleEvent = {
      id: `evt_${9008 + events.length}`,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type,
      patientId,
      tenantId: tenant.id,
      webhook,
      payload
    };

    setEvents((current) => [event, ...current]);
  }

  function updateRecoveryCase(id: string, nextState: PatientState, stage: RecoveryCase["stage"], eventType: string) {
    const current = recoveryCases.find((item) => item.id === id);

    if (!current) {
      return;
    }

    if (nextState === "no-show" && !window.confirm("Mark this synthetic patient as no-show? This records a recovery outcome.")) {
      return;
    }

    setRecoveryCases((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              attempts: eventType === "recovery.attempted" ? item.attempts + 1 : item.attempts,
              state: nextState,
              stage,
              lastContact: eventType === "recovery.attempted" ? "Recovery action sent now" : "Outcome recorded now",
              nextAction: nextState === "recovered" ? "Schedule post-care" : "Await next configured rule"
            }
          : item
      )
    );

    setPatients((items) =>
      items.map((patient) =>
        patient.id === current.patientId
          ? {
              ...patient,
              state: nextState,
              engagement: nextState === "recovered" ? Math.min(patient.engagement + 14, 100) : Math.max(patient.engagement - 8, 0),
              lastInteraction: eventType === "recovery.attempted" ? "Recovery action sent now" : "Recovery outcome recorded now"
            }
          : patient
      )
    );

    appendEvent(eventType, current.patientId, "pending", {
      recoveryCaseId: id,
      attempts: current.attempts + (eventType === "recovery.attempted" ? 1 : 0),
      synthetic: true
    });
  }

  function saveAutomationRules() {
    const enabledCount = reminderRules.filter((rule) => rule.enabled).length;

    if (enabledCount === 0 || webhookEndpoint.length < 12) {
      setRuleMessage("Validation failed: enable at least one reminder and provide a webhook endpoint.");
      return;
    }

    setIsSavingRules(true);
    setRuleMessage("Saving tenant-scoped rules and validating webhook signature settings...");

    window.setTimeout(() => {
      setIsSavingRules(false);
      setRuleMessage(`Saved ${enabledCount} reminder rules with recovery, post-care, renewal, and webhook subscriptions.`);
      appendEvent("automation.rules_configured", "tenant_scope", "emitted", {
        enabledReminderRules: enabledCount,
        webhookConfigured: true,
        phiFree: true
      });
    }, 700);
  }

  function simulateRealtimeRefresh() {
    setIsRefreshing(true);

    window.setTimeout(() => {
      setIsRefreshing(false);
      appendEvent("queue.visible", "tenant_scope", "emitted", {
        queue: "reminders",
        waiting: 18,
        active: 5,
        failed: 1
      });
    }, 650);
  }

  function copyApiKey() {
    void navigator.clipboard?.writeText(apiKey);
    setCopyState("Copied");
    window.setTimeout(() => setCopyState("Copy"), 900);
  }

  function regenerateApiKey() {
    if (!window.confirm("Regenerate this synthetic API key? Existing integrations would need the new key.")) {
      return;
    }

    setApiKey(`clp_live_syn_${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 5)}`);
    appendEvent("api_key.regenerated", "tenant_scope", "pending", {
      actor: "ops_admin_syn",
      keyScope: "tenant_webhooks",
      synthetic: true
    });
  }

  return (
    <main className="careloop-dark-shell relative min-h-[100dvh] overflow-hidden bg-[#111820] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_4%_12%,rgba(20,184,166,0.24),transparent_31%),radial-gradient(circle_at_86%_8%,rgba(96,76,55,0.34),transparent_28%),linear-gradient(135deg,#102e30_0%,#111820_42%,#151820_100%)]" />
      <div className="pointer-events-none fixed inset-0 careloop-grid opacity-[0.35]" />
      <div className="pointer-events-none fixed left-[18rem] top-10 hidden h-56 w-56 rounded-full bg-teal-400/10 blur-3xl lg:block careloop-float" />

      <div className="relative flex min-h-[100dvh]">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/10 bg-[#101820]/95 text-slate-200 shadow-[18px_0_60px_rgba(5,10,16,0.42)] lg:flex">
          <div className="relative overflow-hidden border-b border-white/10 p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(20,184,166,0.20),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(217,119,6,0.13),transparent_32%)]" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-teal-300/20 bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]">
                  <div className="h-4 w-4 rounded-full border border-teal-300 bg-teal-300/20" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.34em] text-teal-300">CareLoop</div>
                  <div className="mt-1 text-sm font-medium text-white/80">Retention OS</div>
                </div>
              </div>
              <div className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">Operations Cockpit</div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <PhiBadge />
              <span className="rounded-full border border-slate-700 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                synthetic
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = item.id === activeSection;

              return (
                <button
                  key={item.id}
                  className={`group w-full rounded-2xl border-l-2 px-3 py-3 text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isActive
                      ? "border-teal-400 bg-white/[0.08] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.10)]"
                      : "border-transparent text-slate-400 hover:translate-x-1 hover:bg-white/[0.04] hover:text-slate-100"
                  }`}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-300">{item.meta}</div>
                  <div className="mt-1 text-sm font-medium">{item.label}</div>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Tenant Context</div>
            <div className="mt-2 text-sm font-medium text-white">{tenant.name}</div>
            <div className="mt-1 font-mono text-[11px] text-slate-500">{tenant.id}</div>
            <div className="mt-3 rounded-lg border border-teal-400/20 bg-teal-400/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-teal-200">
              {tenant.isolation}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:pl-72">
          <header className="sticky top-4 z-10 mx-4 mt-4 rounded-[2rem] border border-white/10 bg-[#172028]/78 px-5 py-4 shadow-[0_24px_80px_rgba(5,10,16,0.32)] backdrop-blur-2xl md:mx-8 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {navItems.find((item) => item.id === activeSection)?.meta}
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  {navItems.find((item) => item.id === activeSection)?.label}
                </h1>
                <select
                  className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm lg:hidden"
                  value={activeSection}
                  onChange={(event) => setActiveSection(event.target.value as SectionId)}
                >
                  {navItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PhiBadge dark />
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-600">
                  {tenant.name}
                </span>
                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-teal-700">
                  live tenant scope
                </span>
              </div>
            </div>
          </header>

          <div className="px-4 py-8 md:p-8">
            {activeSection === "dashboard" ? (
              <DashboardSection
                events={events}
                metrics={metrics}
                patients={patients}
                recoveryCases={recoveryCases}
                isRefreshing={isRefreshing}
                onRefresh={simulateRealtimeRefresh}
                onSelectPatient={(patientId) => {
                  setSelectedPatientId(patientId);
                  setActiveSection("patients");
                }}
              />
            ) : null}
            {activeSection === "recovery" ? (
              <RecoverySection
                activeTab={activeRecoveryTab}
                cases={filteredRecoveryCases}
                allCases={recoveryCases}
                onTabChange={setActiveRecoveryTab}
                onAttempt={(id) => updateRecoveryCase(id, "at-risk", "Active Recovery", "recovery.attempted")}
                onNoShow={(id) => updateRecoveryCase(id, "no-show", "Resolved", "recovery.failed")}
                onRecovered={(id) => updateRecoveryCase(id, "recovered", "Resolved", "recovery.succeeded")}
              />
            ) : null}
            {activeSection === "automation" ? (
              <AutomationSection
                endpoint={webhookEndpoint}
                isSaving={isSavingRules}
                message={ruleMessage}
                rules={reminderRules}
                onEndpointChange={setWebhookEndpoint}
                onRuleChange={setReminderRules}
                onSave={saveAutomationRules}
              />
            ) : null}
            {activeSection === "patients" ? (
              <PatientsSection
                activeTab={patientTab}
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={setSelectedPatientId}
                onTabChange={setPatientTab}
              />
            ) : null}
            {activeSection === "briefing" ? <BriefingSection patient={selectedPatient} /> : null}
            {activeSection === "events" ? (
              <EventsSection
                dateFilter={dateFilter}
                eventFilter={eventFilter}
                events={filteredEvents}
                expandedEventId={expandedEventId}
                patientFilter={patientFilter}
                onDateFilterChange={setDateFilter}
                onEventFilterChange={setEventFilter}
                onPatientFilterChange={setPatientFilter}
                onToggleExpanded={(eventId) => setExpandedEventId(expandedEventId === eventId ? null : eventId)}
              />
            ) : null}
            {activeSection === "settings" ? (
              <SettingsSection
                apiKey={apiKey}
                copyState={copyState}
                onCopy={copyApiKey}
                onRegenerate={regenerateApiKey}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardSection({
  events,
  metrics,
  patients,
  recoveryCases,
  isRefreshing,
  onRefresh,
  onSelectPatient
}: {
  events: LifecycleEvent[];
  metrics: { lifecycleEvents: number; recoveryRate: number; avgEngagement: number; trackedLtv: number };
  patients: Patient[];
  recoveryCases: RecoveryCase[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onSelectPatient: (patientId: string) => void;
}) {
  const activeJobs = recoveryCases.filter((item) => item.stage === "Active Recovery").length;
  const failedJobs = recoveryCases.filter((item) => item.state === "no-show").length;
  const successJobs = recoveryCases.filter((item) => item.state === "recovered").length;

  return (
    <div className="space-y-6">
      <div className="rounded-[2.25rem] border border-slate-950/10 bg-[#10131b] p-1.5 shadow-[0_40px_120px_rgba(15,17,23,0.24)] careloop-reveal">
        <div className="relative overflow-hidden rounded-[calc(2.25rem-0.375rem)] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(20,184,166,0.28),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(217,119,6,0.18),transparent_28%),linear-gradient(135deg,#0f1117,#171b25)] p-6 text-white md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-200">
                PHI-free synthetic tenant simulation
              </div>
              <h2 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.07em] text-white md:text-6xl">
                Retention lifecycle command layer for healthcare operations.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
                Every visible action maps to tenant rules, queue orchestration, audit events, recovery outcomes, LTV updates, and signed webhook delivery.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
              <div className="grid gap-2">
                {["automation.rules_configured", "appointment.booked", "queue.job_scheduled", "recovery.attempted", "ltv.updated", "webhook.emitted"].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:translate-x-1 hover:border-teal-300/40"
                  >
                    <span className="font-mono text-xs text-slate-200">{item}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-teal-200">step {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Lifecycle Events" value={metrics.lifecycleEvents.toString()} delta="+18.4% vs baseline" />
        <MetricCard label="Recovery Rate" value={`${metrics.recoveryRate}%`} delta="+6.2% from last cycle" tone="green" />
        <MetricCard label="Avg Engagement" value={`${metrics.avgEngagement}/100`} delta="+4 pts rolling 7d" tone="teal" />
        <MetricCard label="Tracked LTV" value={`$${metrics.trackedLtv.toLocaleString("en-US")}`} delta="+$1.2k net delta" tone="green" />
      </div>

      <Panel>
        <PanelHeader
          eyebrow="SERVER PIPELINE"
          title="Backend Flow"
          action={
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs uppercase tracking-wider text-slate-700 hover:border-teal-300 hover:text-teal-700"
              type="button"
              onClick={onRefresh}
            >
              Simulate realtime update
            </button>
          }
        />
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          {pipeline.map((node, index) => (
            <div key={node} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Step {index + 1}</div>
              <div className="mt-2 min-h-10 text-sm font-semibold text-slate-900">{node}</div>
              <div className="mt-3 h-1.5 rounded-full bg-teal-500" />
              <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-teal-700">live</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <PanelHeader eyebrow="EVENT SPINE" title="Realtime lifecycle feed" />
          {isRefreshing ? <SkeletonRows /> : null}
          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="animate-[fadeIn_220ms_ease-out] rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <StatusPill label={event.type} tone="slate" />
                  <span className="font-mono text-xs text-slate-500">{event.time}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="font-mono">{event.patientId}</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-mono">{event.tenantId}</span>
                  <WebhookPill state={event.webhook} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="RECOVERY ENGINE" title="Queue health" />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recovery success rate</div>
                <div className="mt-2 text-5xl font-semibold tracking-tight text-slate-950">{metrics.recoveryRate}%</div>
              </div>
              <div className="h-24 w-24 rounded-full border-[10px] border-teal-500 border-l-amber-500 border-t-green-500" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <QueueStat label="Active" value={activeJobs} tone="amber" />
              <QueueStat label="Succeeded" value={successJobs} tone="green" />
              <QueueStat label="Failed" value={failedJobs} tone="red" />
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow="PATIENTS AT RISK" title="Retention worklist" />
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Engagement</th>
                <th className="px-4 py-3">Churn Risk</th>
                <th className="px-4 py-3">LTV Delta</th>
                <th className="px-4 py-3">Last Interaction</th>
                <th className="px-4 py-3">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {patients
                .filter((patient) => patient.churnRisk === "high" || patient.churnRisk === "critical")
                .map((patient) => (
                  <tr
                    key={patient.id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => onSelectPatient(patient.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{patient.name}</div>
                      <div className="font-mono text-xs text-slate-500">{patient.id}</div>
                    </td>
                    <td className="px-4 py-3"><EngagementScore value={patient.engagement} /></td>
                    <td className="px-4 py-3"><StatusPill label={patient.state} tone={patient.state} /></td>
                    <td className={`px-4 py-3 font-mono ${patient.ltvDelta >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {patient.ltvDelta >= 0 ? "+" : ""}${patient.ltvDelta}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{patient.lastInteraction}</td>
                    <td className="px-4 py-3 text-slate-600">{patient.nextAction}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function RecoverySection({
  activeTab,
  allCases,
  cases,
  onAttempt,
  onNoShow,
  onRecovered,
  onTabChange
}: {
  activeTab: string;
  allCases: RecoveryCase[];
  cases: RecoveryCase[];
  onAttempt: (id: string) => void;
  onNoShow: (id: string) => void;
  onRecovered: (id: string) => void;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ["Unconfirmed", "No-Show Risk", "Active Recovery", "Resolved"];
  const resolved = allCases.filter((item) => item.state === "recovered").length;
  const attempted = allCases.filter((item) => item.attempts > 0).length || 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <PanelHeader eyebrow="RECOVERY RATE" title={`${Math.round((resolved / attempted) * 100)}% success`} />
          <div className="text-sm leading-6 text-slate-600">
            Recovery rate is computed from discrete synthetic audit events:
            <span className="ml-1 font-mono text-slate-900">recovery.attempted</span>,
            <span className="ml-1 font-mono text-slate-900">recovery.succeeded</span>, and
            <span className="ml-1 font-mono text-slate-900">recovery.failed</span>.
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="BULLMQ QUEUES" title="Recovery job states" />
          <div className="grid grid-cols-4 gap-3">
            <QueueStat label="Waiting" value={6} tone="slate" />
            <QueueStat label="Active" value={4} tone="amber" />
            <QueueStat label="Delayed" value={12} tone="teal" />
            <QueueStat label="Failed" value={1} tone="red" />
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                activeTab === tab
                  ? "border-teal-300 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
              type="button"
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          {cases.length === 0 ? (
            <EmptyState title="No recovery cases in this lane" body="Synthetic queue visibility remains active, but no patient currently matches this filter." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Appointment</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Last Contact</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {cases.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.patientName}</div>
                      <div className="font-mono text-xs text-slate-500">{item.patientId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.appointmentTime}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{item.attempts}</td>
                    <td className="px-4 py-3"><StatusPill label={item.state} tone={item.state} /></td>
                    <td className="px-4 py-3 text-slate-600">{item.lastContact}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton label="Attempt Recovery" onClick={() => onAttempt(item.id)} />
                        <ActionButton label="Mark No-Show" tone="red" onClick={() => onNoShow(item.id)} />
                        <ActionButton label="Mark Recovered" tone="green" onClick={() => onRecovered(item.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}

function AutomationSection({
  endpoint,
  isSaving,
  message,
  rules,
  onEndpointChange,
  onRuleChange,
  onSave
}: {
  endpoint: string;
  isSaving: boolean;
  message: string;
  rules: ReminderRule[];
  onEndpointChange: (value: string) => void;
  onRuleChange: (rules: ReminderRule[]) => void;
  onSave: () => void;
}) {
  function updateRule(id: string, patch: Partial<ReminderRule>) {
    onRuleChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader eyebrow="CANONICAL STEP 0" title="Tenant configures automation rules" />
        <div className="grid gap-4 lg:grid-cols-4">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-lg font-semibold text-slate-950">{rule.offset}</div>
                <button
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    rule.enabled ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500"
                  }`}
                  type="button"
                  onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                >
                  {rule.enabled ? "enabled" : "disabled"}
                </button>
              </div>
              <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Channel</label>
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={rule.channel}
                onChange={(event) => updateRule(rule.id, { channel: event.target.value as ReminderRule["channel"] })}
              >
                <option value="email">email</option>
                <option value="sms">sms</option>
                <option value="push">push</option>
              </select>
              <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Template</label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
                value={rule.template}
                onChange={(event) => updateRule(rule.id, { template: event.target.value })}
              />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="RECOVERY LOGIC" title="Failure path configuration" />
          <div className="grid gap-4 md:grid-cols-3">
            <ConfigField label="Max Attempts" value="3" />
            <ConfigField label="Delay Between Attempts" value="45m" />
            <ConfigField label="Escalation Rule" value="call_after_sms_fail" />
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Reminder storm prevention is enforced through stable idempotency keys, duplicate suppression, and tenant-scoped queue limits.
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="POST-CARE SEQUENCE" title="Follow-up automation" />
          <div className="grid gap-3 md:grid-cols-3">
            {["D+1 check-in", "D+7 adherence", "D+30 retention"].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="font-mono text-xs uppercase tracking-wider text-teal-700">active</div>
                <div className="mt-2 font-medium text-slate-900">{item}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow="RENEWALS AND WEBHOOKS" title="Prescription monitoring and outbound contracts" />
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ConfigField label="Renewal Trigger" value="14 days before expiry" />
            <ConfigField label="Renewal Channel" value="sms + email fallback" />
            <ConfigField label="Renewal Message" value="rx_renewal_synthetic_v2" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Endpoint URL</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
              value={endpoint}
              onChange={(event) => onEndpointChange(event.target.value)}
            />
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {["appointment.booked", "recovery.succeeded", "webhook.emitted"].map((item) => (
                <StatusPill key={item} label={item} tone="slate" />
              ))}
            </div>
            <div className="mt-3 font-mono text-xs text-slate-500">signing_key: whsec_syn_4c92...ad1</div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className={`text-sm ${message.startsWith("Validation") ? "text-red-700" : "text-slate-600"}`}>{message}</div>
          <button
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={isSaving}
            onClick={onSave}
          >
            {isSaving ? "Saving policy..." : "Save automation rules"}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function PatientsSection({
  activeTab,
  patients,
  selectedPatient,
  onSelectPatient,
  onTabChange
}: {
  activeTab: string;
  patients: Patient[];
  selectedPatient: Patient;
  onSelectPatient: (id: string) => void;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ["Timeline", "Appointments", "Reminders", "Recovery", "AI Context"];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <Panel>
        <PanelHeader eyebrow="PATIENT INDEX" title="Synthetic profiles" />
        <div className="space-y-2">
          {patients.map((patient) => (
            <button
              key={patient.id}
              className={`w-full rounded-xl border p-4 text-left transition ${
                patient.id === selectedPatient.id ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              type="button"
              onClick={() => onSelectPatient(patient.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-950">{patient.name}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">{patient.id}</div>
                </div>
                <StatusPill label={patient.state} tone={patient.state} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <EngagementScore value={patient.engagement} />
                <div className={`font-mono text-xs ${patient.ltvDelta >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {patient.ltvDelta >= 0 ? "+" : ""}${patient.ltvDelta} LTV
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{tenant.name}</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{selectedPatient.name}</h2>
            <div className="mt-2 font-mono text-xs text-slate-500">{selectedPatient.id}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ScoreRing value={selectedPatient.engagement} />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Risk</div>
              <div className="mt-2"><StatusPill label={selectedPatient.churnRisk} tone={selectedPatient.state} /></div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">LTV</div>
              <div className="mt-2 font-mono text-lg font-semibold text-slate-950">${selectedPatient.ltv}</div>
              <div className={`font-mono text-xs ${selectedPatient.ltvDelta >= 0 ? "text-green-700" : "text-red-700"}`}>
                {selectedPatient.ltvDelta >= 0 ? "+" : ""}${selectedPatient.ltvDelta} vs baseline
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                activeTab === tab ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500"
              }`}
              type="button"
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{activeTab}</div>
            <div className="mt-4 space-y-4">
              {["appointment.booked", "queue.job_scheduled", "reminder.sent", "state.changed", "webhook.emitted"].map((item, index) => (
                <div key={item} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-500" />
                  <div>
                    <StatusPill label={item} tone="slate" />
                    <div className="mt-1 text-sm text-slate-600">
                      {index + 1} lifecycle signal recorded for {selectedPatient.name}. Payload is PHI-minimized and tenant-scoped.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Engagement Trend</div>
              <div className="mt-5 flex h-24 items-end gap-2">
                {[38, 44, 42, 58, selectedPatient.engagement - 10, selectedPatient.engagement].map((value, index) => (
                  <div key={`${value}-${index}`} className={`flex-1 rounded-t bg-teal-500 ${sparkHeight(value)}`} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Next scheduled action</div>
              <div className="mt-2 font-medium text-amber-950">{selectedPatient.nextAction}</div>
              <div className="mt-3 font-mono text-xs text-amber-700">countdown: 00:12:31</div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function BriefingSection({ patient }: { patient: Patient }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Permanent warning</div>
        <div className="mt-2 text-sm font-semibold">
          AI-GENERATED SUMMARY - ASSISTIVE ONLY. This content must not be used for diagnosis, prescribing, or clinical decision-making without physician review.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <PanelHeader eyebrow="PATIENT CONTEXT" title={patient.name} />
          <div className="space-y-4">
            <InfoRow label="Appointment Type" value={patient.appointmentType} />
            <InfoRow label="Last Visit" value="Synthetic visit completed 42 days ago" />
            <InfoRow label="Engagement Score" value={`${patient.engagement}/100`} />
            <InfoRow label="Context Status" value={patient.aiStatus} pill={<StatusPill label={patient.aiStatus} tone="ai" aiStatus={patient.aiStatus} />} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="AI SUMMARY" title="Pre-consultation briefing" />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            Synthetic operational summary: {patient.name} has a current engagement score of {patient.engagement}/100, a {patient.churnRisk} churn-risk label, and a scheduled {patient.appointmentType.toLowerCase()}. Recent lifecycle signals indicate {patient.lastInteraction.toLowerCase()}. Recommended staff action is operational only: verify appointment intent, confirm post-care sequence eligibility, and review renewal workflow status.
          </div>
          <div className="mt-4 font-mono text-xs text-slate-500">generated_at: 2026-05-08T13:44:12Z / source: guarded_ai / phi_free: true</div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow="RISK INDICATORS" title="Operational flags" />
        <div className="grid gap-3 md:grid-cols-3">
          {["Repeated reminder non-response", "Prescription renewal window active", "Recovery SLA approaching"].map((item) => (
            <div key={item} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function EventsSection({
  dateFilter,
  eventFilter,
  events,
  expandedEventId,
  patientFilter,
  onDateFilterChange,
  onEventFilterChange,
  onPatientFilterChange,
  onToggleExpanded
}: {
  dateFilter: string;
  eventFilter: string;
  events: LifecycleEvent[];
  expandedEventId: string | null;
  patientFilter: string;
  onDateFilterChange: (value: string) => void;
  onEventFilterChange: (value: string) => void;
  onPatientFilterChange: (value: string) => void;
  onToggleExpanded: (eventId: string) => void;
}) {
  return (
    <Panel>
      <PanelHeader eyebrow="AUDIT FEED" title="Lifecycle event log" />
      <div className="grid gap-3 md:grid-cols-3">
        <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={eventFilter} onChange={(event) => onEventFilterChange(event.target.value)}>
          {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm" placeholder="patient id filter" value={patientFilter} onChange={(event) => onPatientFilterChange(event.target.value)} />
        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm" placeholder="time prefix, ex: 13:" value={dateFilter} onChange={(event) => onDateFilterChange(event.target.value)} />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        {events.length === 0 ? (
          <EmptyState title="No events match this filter" body="Adjust event type, patient, or time prefix. The audit feed remains PHI-minimized." />
        ) : (
          <div className="divide-y divide-slate-200 bg-white">
            {events.map((event) => (
              <button
                key={event.id}
                className="block w-full p-4 text-left transition hover:bg-slate-50"
                type="button"
                onClick={() => onToggleExpanded(event.id)}
              >
                <div className="grid gap-3 md:grid-cols-[0.7fr_1fr_1fr_1fr_0.7fr]">
                  <span className="font-mono text-xs text-slate-500">{event.time}</span>
                  <StatusPill label={event.type} tone="slate" />
                  <span className="font-mono text-xs text-slate-700">{event.patientId}</span>
                  <span className="font-mono text-xs text-slate-500">{event.tenantId}</span>
                  <WebhookPill state={event.webhook} />
                </div>
                {expandedEventId === event.id ? (
                  <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
                    {JSON.stringify({ id: event.id, type: event.type, tenantScoped: true, phiMinimized: true, payload: event.payload }, null, 2)}
                  </pre>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function SettingsSection({
  apiKey,
  copyState,
  onCopy,
  onRegenerate
}: {
  apiKey: string;
  copyState: string;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="TENANT" title="Isolation and plan" />
          <div className="space-y-4">
            <InfoRow label="Name" value={tenant.name} />
            <InfoRow label="Tenant ID" value={tenant.id} />
            <InfoRow label="Plan" value={tenant.plan} />
            <InfoRow label="Isolation Status" value={tenant.isolation} />
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="PHI POLICY" title="Acknowledgement" />
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm leading-6 text-teal-900">
            This environment is PHI-free. All patient names, identifiers, metrics, payloads, screenshots, and examples are synthetic by policy.
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow="AUTOMATION STATUS" title="Tenant rules" />
        <div className="grid gap-3 md:grid-cols-5">
          {["Reminders", "Recovery", "Post-care", "Renewals", "Webhooks"].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-950">{item}</div>
              <div className="mt-3"><StatusPill label="active" tone="confirmed" /></div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="WEBHOOK ENDPOINTS" title="Delivery controls" />
          <div className="space-y-3">
            <InfoRow label="Endpoint" value="https://ops.northstar.example/webhooks/careloop" />
            <InfoRow label="Last Delivery" value="13:41:03 UTC" />
            <InfoRow label="Success Rate" value="98.7%" />
            <InfoRow label="Signing Key" value="whsec_syn_4c92...ad1" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="API KEYS" title="Tenant integration key" />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700">{apiKey}</div>
          <div className="mt-4 flex gap-2">
            <ActionButton label={copyState} onClick={onCopy} />
            <ActionButton label="Regenerate" tone="red" onClick={onRegenerate} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  tone = "slate"
}: {
  label: string;
  value: string;
  delta: string;
  tone?: "slate" | "teal" | "green";
}) {
  const accent = tone === "green" ? "text-green-700" : tone === "teal" ? "text-teal-700" : "text-slate-700";

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-1.5 shadow-[0_24px_70px_rgba(5,10,16,0.24)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-teal-300/30 hover:shadow-[0_34px_90px_rgba(5,10,16,0.38)]">
      <div className="rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#172028]/88 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.11)]">
        <div className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-100">
          {label}
        </div>
        <div className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white">{value}</div>
        <div className={`mt-2 font-mono text-xs ${accent}`}>{delta}</div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-1.5 shadow-[0_28px_90px_rgba(5,10,16,0.28)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] careloop-reveal">
      <div className="rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#172028]/88 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.11)]">
        {children}
      </div>
    </section>
  );
}

function PanelHeader({
  action,
  eyebrow,
  title
}: {
  action?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function PhiBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] ${
        dark ? "border-teal-200 bg-teal-50 text-teal-700" : "border-teal-300/30 bg-teal-300/10 text-teal-200"
      }`}
    >
      PHI-FREE
    </span>
  );
}

function StatusPill({
  aiStatus,
  label,
  tone
}: {
  aiStatus?: ContextStatus;
  label: string;
  tone: PatientState | "slate" | "ai";
}) {
  const className =
    tone === "slate"
      ? "border-slate-200 bg-slate-100 text-slate-600"
      : tone === "ai" && aiStatus
        ? aiTone[aiStatus]
        : stateTone[tone as PatientState];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

function WebhookPill({ state }: { state: WebhookState }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${webhookTone[state]}`}>
      webhook.{state}
    </span>
  );
}

function EngagementScore({ value }: { value: number }) {
  const activeSegments = Math.round(value / 10);

  return (
    <div className="flex items-center gap-2" aria-label={`Engagement score ${value} out of 100`}>
      <div className="flex w-24 gap-1">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} className={`h-2 flex-1 rounded-full ${index < activeSegments ? "bg-teal-500" : "bg-slate-200"}`} />
        ))}
      </div>
      <span className="font-mono text-xs text-slate-700">{value}/100</span>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Engagement</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full border-4 border-teal-500 bg-white text-xs font-semibold text-slate-950">
          <div className="font-mono text-[11px]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function QueueStat({
  label,
  tone,
  value
}: {
  label: string;
  tone: "slate" | "amber" | "green" | "red" | "teal";
  value: number;
}) {
  const color = {
    slate: "text-slate-200",
    amber: "text-amber-100",
    green: "text-green-100",
    red: "text-red-100",
    teal: "text-teal-100"
  }[tone];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  tone = "teal"
}: {
  label: string;
  onClick: () => void;
  tone?: "teal" | "red" | "green";
}) {
  const className = {
    teal: "border-teal-300/30 bg-teal-300/10 text-teal-50 hover:bg-teal-300/16",
    red: "border-red-300/30 bg-red-400/10 text-red-50 hover:bg-red-400/16",
    green: "border-green-300/30 bg-green-300/10 text-green-50 hover:bg-green-300/16"
  }[tone];

  return (
    <button
      className={`group inline-flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 text-xs font-semibold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${className}`}
      type="button"
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 font-mono text-[10px] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
        +
      </span>
    </button>
  );
}

function ConfigField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.055] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">{label}</div>
      <div className="mt-2 font-mono text-sm text-white">{value}</div>
    </div>
  );
}

function InfoRow({
  label,
  pill,
  value
}: {
  label: string;
  pill?: ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.055] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">{label}</div>
      <div className="text-right font-mono text-sm text-white">{pill ?? value}</div>
    </div>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="p-10 text-center">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">{body}</div>
      <button className="mt-5 rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-400" type="button">
        Review automation rules
      </button>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="mb-4 space-y-2">
      {[0, 1].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function sparkHeight(value: number) {
  if (value >= 80) {
    return "h-24";
  }

  if (value >= 70) {
    return "h-20";
  }

  if (value >= 60) {
    return "h-16";
  }

  if (value >= 50) {
    return "h-14";
  }

  if (value >= 40) {
    return "h-12";
  }

  if (value >= 30) {
    return "h-10";
  }

  return "h-8";
}
