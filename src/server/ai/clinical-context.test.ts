import { describe, expect, it } from "vitest";
import type { AppointmentRecord, LifecycleEventInput } from "@/server/appointments/lifecycle";
import type { AiClinicalContextJobData } from "@/server/queues/contracts";
import { createMockTenantContext } from "@/server/tenant/context";
import type { AiClinicalContextResultInput, RecordAuditLogInput } from "@/server/validation/core";
import {
  buildClinicalContextPrompt,
  generateClinicalContextLifecycle,
  scheduleClinicalContextLifecycle,
  type AiClinicalContextPorts
} from "./clinical-context";

const tenantId = "00000000-0000-4000-8000-000000000001";
const otherTenantId = "00000000-0000-4000-8000-000000000002";
const patientId = "00000000-0000-4000-8000-000000000020";
const appointmentId = "00000000-0000-4000-8000-000000000030";

function createAppointment(overrides: Partial<AppointmentRecord> = {}): AppointmentRecord {
  return {
    id: appointmentId,
    tenantId,
    patientId,
    status: "completed",
    recoveryStatus: "succeeded",
    scheduledAt: new Date("2026-05-10T14:00:00.000Z"),
    ...overrides
  };
}

function createPorts(overrides: Partial<AiClinicalContextPorts> = {}) {
  const jobs: AiClinicalContextJobData[] = [];
  const records: AiClinicalContextResultInput[] = [];
  const events: LifecycleEventInput[] = [];
  const stateChanges: Omit<LifecycleEventInput, "name">[] = [];
  const audits: RecordAuditLogInput[] = [];

  const ports: AiClinicalContextPorts = {
    getAppointment: async () => createAppointment(),
    scheduleAiClinicalContextJob: async (job) => {
      jobs.push(job);
    },
    recordAiClinicalContext: async (_context, input) => {
      records.push(input);
    },
    emitLifecycleEvent: async (_context, input) => {
      events.push(input);
    },
    emitStateChanged: async (_context, input) => {
      stateChanges.push(input);
    },
    recordAuditLog: async (_context, input) => {
      audits.push(input);
    },
    ...overrides
  };

  return { ports, jobs, records, events, stateChanges, audits };
}

describe("AI clinical context lifecycle", () => {
  it("builds a PHI-minimized prompt from tenant-scoped operational state", () => {
    const context = createMockTenantContext({ tenantId });
    const prompt = buildClinicalContextPrompt({
      context,
      appointment: createAppointment(),
      mode: "pre_consultation"
    });

    expect(prompt).toContain(`tenant_id=${tenantId}`);
    expect(prompt).toContain(`appointment_id=${appointmentId}`);
    expect(prompt).toContain(`patient_id=${patientId}`);
    expect(prompt).not.toContain("displayName");
    expect(prompt).not.toContain("email");
    expect(prompt).toContain("Do not diagnose, prescribe");
  });

  it("schedules AI context generation through BullMQ", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-6-schedule" });
    const { ports, jobs, events, audits } = createPorts();

    await scheduleClinicalContextLifecycle(context, {
      appointmentId,
      mode: "post_consultation"
    }, ports);

    expect(jobs[0]).toMatchObject({
      tenantId,
      appointmentId,
      patientId,
      mode: "post_consultation"
    });
    expect(events.map((event) => event.name)).toEqual(["queue.job_scheduled"]);
    expect(audits[0]).toMatchObject({
      targetId: appointmentId,
      source: "queue.job_scheduled",
      newState: "ai_context_scheduled"
    });
  });

  it("persists safe assistive context and emits audit/state events", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-6-generate" });
    const { ports, records, events, stateChanges, audits } = createPorts();

    await generateClinicalContextLifecycle(context, { appointmentId }, ports, {
      async generate() {
        return { summary: "Assistive operational context only. Review recovery state and engagement risk." };
      }
    });

    expect(records[0]).toMatchObject({
      appointmentId,
      patientId,
      status: "generated",
      source: "guarded_ai"
    });
    expect(events.map((event) => event.name)).toEqual(["consultation.context_generated"]);
    expect(stateChanges[0]?.payload).toMatchObject({
      reason: "consultation.context_generated"
    });
    expect(audits[0]).toMatchObject({
      source: "consultation.context_generated",
      newState: "ai_context_generated"
    });
  });

  it("rejects unsafe AI output and persists fallback context", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-6-unsafe-output" });
    const { ports, records, events } = createPorts();

    await generateClinicalContextLifecycle(context, { appointmentId }, ports, {
      async generate() {
        return { summary: "Diagnose the patient and prescribe a dosage." };
      }
    });

    expect(records[0]).toMatchObject({
      status: "rejected",
      source: "fallback"
    });
    expect(records[0]?.summary).toContain("AI assistive context is unavailable.");
    expect(events[0]?.payload).toMatchObject({
      status: "rejected",
      source: "fallback"
    });
  });

  it("falls back when the provider fails", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-6-provider-fail" });
    const { ports, records } = createPorts();

    await generateClinicalContextLifecycle(context, { appointmentId }, ports, {
      async generate() {
        throw new Error("provider unavailable");
      }
    });

    expect(records[0]).toMatchObject({
      status: "fallback",
      source: "fallback"
    });
  });

  it("rejects cross-tenant appointments before AI generation", async () => {
    const context = createMockTenantContext({ tenantId });
    const { ports, records, events } = createPorts({
      getAppointment: async () => createAppointment({ tenantId: otherTenantId })
    });

    await expect(generateClinicalContextLifecycle(context, { appointmentId }, ports)).rejects.toThrow(
      "Cross-tenant access denied."
    );

    expect(records).toHaveLength(0);
    expect(events).toHaveLength(0);
  });
});
