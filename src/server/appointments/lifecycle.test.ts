import { describe, expect, it } from "vitest";
import { createMockTenantContext } from "@/server/tenant/context";
import {
  bookAppointmentLifecycle,
  confirmAppointmentLifecycle,
  markAppointmentUnresponsiveLifecycle,
  type AppointmentLifecyclePorts,
  type AppointmentRecord,
  type LifecycleEventInput
} from "./lifecycle";
import type { ReminderJobData } from "@/server/queues/contracts";
import type { RecordAuditLogInput, UpsertEngagementScoreInput } from "@/server/validation/core";

const tenantId = "00000000-0000-4000-8000-000000000001";
const otherTenantId = "00000000-0000-4000-8000-000000000002";
const patientId = "00000000-0000-4000-8000-000000000020";
const appointmentId = "00000000-0000-4000-8000-000000000030";
const scheduledAt = new Date("2026-05-10T14:00:00.000Z");

function createAppointmentRecord(overrides: Partial<AppointmentRecord> = {}): AppointmentRecord {
  return {
    id: appointmentId,
    tenantId,
    patientId,
    status: "booked",
    recoveryStatus: "not_started",
    scheduledAt,
    ...overrides
  };
}

function createPorts(overrides: Partial<AppointmentLifecyclePorts> = {}) {
  const reminderJobs: ReminderJobData[] = [];
  const events: LifecycleEventInput[] = [];
  const stateChanges: Omit<LifecycleEventInput, "name">[] = [];
  const audits: RecordAuditLogInput[] = [];
  const scores: UpsertEngagementScoreInput[] = [];

  const ports: AppointmentLifecyclePorts = {
    createAppointment: async () => createAppointmentRecord(),
    transitionAppointment: async () => ({
      previous: createAppointmentRecord(),
      appointment: createAppointmentRecord({ status: "confirmed", recoveryStatus: "succeeded" })
    }),
    scheduleReminderJob: async (job) => {
      reminderJobs.push(job);
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
    upsertEngagementScore: async (_context, input) => {
      scores.push(input);
    },
    ...overrides
  };

  return { ports, reminderJobs, events, stateChanges, audits, scores };
}

describe("appointment lifecycle", () => {
  it("books an appointment, schedules reminders, emits events, audits, and updates engagement", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-4-booking" });
    const { ports, reminderJobs, events, stateChanges, audits, scores } = createPorts();

    const result = await bookAppointmentLifecycle(context, {
      patientId,
      scheduledAt,
      now: new Date("2026-05-08T13:00:00.000Z")
    }, ports);

    expect(result.appointment.id).toBe(appointmentId);
    expect(reminderJobs.map((job) => job.offset)).toEqual(["48h", "24h", "2h", "30m"]);
    expect(events.map((event) => event.name)).toEqual(["queue.job_scheduled", "appointment.booked"]);
    expect(events[0]?.payload).toMatchObject({
      queue: "reminders",
      jobCount: 4,
      offsets: ["48h", "24h", "2h", "30m"]
    });
    expect(stateChanges).toHaveLength(1);
    expect(stateChanges[0]?.payload).toMatchObject({
      previousState: null,
      newState: "booked",
      reason: "appointment.booked"
    });
    expect(audits[0]).toMatchObject({
      targetType: "appointment",
      targetId: appointmentId,
      newState: "reminders_scheduled",
      source: "queue.job_scheduled"
    });
    expect(audits[1]).toMatchObject({
      targetType: "appointment",
      targetId: appointmentId,
      newState: "booked",
      source: "appointment.booked"
    });
    expect(scores[0]).toEqual({
      patientId,
      score: 50,
      churnRisk: "moderate"
    });
  });

  it("confirms an appointment as a tenant-scoped state transition", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-4-confirm" });
    const { ports, events, stateChanges, audits, scores } = createPorts();

    const result = await confirmAppointmentLifecycle(context, { appointmentId }, ports);

    expect(result.previous.status).toBe("booked");
    expect(result.appointment.status).toBe("confirmed");
    expect(events.map((event) => event.name)).toEqual(["patient.confirmed"]);
    expect(stateChanges[0]?.payload).toMatchObject({
      previousState: "booked",
      newState: "confirmed",
      reason: "patient.confirmed"
    });
    expect(audits[0]).toMatchObject({
      previousState: "booked",
      newState: "confirmed",
      source: "patient.confirmed"
    });
    expect(scores[0]).toEqual({
      patientId,
      score: 75,
      churnRisk: "retained"
    });
  });

  it("marks unresponsive appointments as the recovery entrypoint", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-4-unresponsive" });
    const { ports, events, stateChanges, audits, scores } = createPorts({
      transitionAppointment: async () => ({
        previous: createAppointmentRecord(),
        appointment: createAppointmentRecord({ recoveryStatus: "in_progress" })
      })
    });

    await markAppointmentUnresponsiveLifecycle(context, { appointmentId }, ports);

    expect(events.map((event) => event.name)).toEqual(["patient.unresponsive", "recovery.started"]);
    expect(stateChanges[0]?.payload).toMatchObject({
      previousState: "not_started",
      newState: "in_progress",
      reason: "patient.unresponsive"
    });
    expect(audits[0]).toMatchObject({
      previousState: "not_started",
      newState: "in_progress",
      source: "patient.unresponsive"
    });
    expect(scores[0]).toEqual({
      patientId,
      score: 35,
      churnRisk: "high"
    });
  });

  it("rejects cross-tenant appointment records before queue or event fanout", async () => {
    const context = createMockTenantContext({ tenantId });
    const { ports, reminderJobs, events } = createPorts({
      createAppointment: async () => createAppointmentRecord({ tenantId: otherTenantId })
    });

    await expect(bookAppointmentLifecycle(context, {
      patientId,
      scheduledAt,
      now: new Date("2026-05-08T13:00:00.000Z")
    }, ports)).rejects.toThrow("Cross-tenant access denied.");

    expect(reminderJobs).toHaveLength(0);
    expect(events).toHaveLength(0);
  });
});
