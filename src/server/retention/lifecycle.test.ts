import { describe, expect, it } from "vitest";
import type { AppointmentRecord, AppointmentTransitionResult, LifecycleEventInput } from "@/server/appointments/lifecycle";
import type { FollowupJobData, RecoveryJobData } from "@/server/queues/contracts";
import { createMockTenantContext } from "@/server/tenant/context";
import type { RecordAuditLogInput, UpsertEngagementScoreInput, UpsertLtvRecordInput } from "@/server/validation/core";
import {
  completeConsultationLifecycle,
  markRecoveryFailedLifecycle,
  markRecoverySucceededLifecycle,
  monitorPrescriptionRenewalLifecycle,
  recordPatientReturnedLifecycle,
  scheduleRecoveryAttemptLifecycle,
  type PatientRecord,
  type RetentionLifecyclePorts
} from "./lifecycle";

const tenantId = "00000000-0000-4000-8000-000000000001";
const otherTenantId = "00000000-0000-4000-8000-000000000002";
const patientId = "00000000-0000-4000-8000-000000000020";
const appointmentId = "00000000-0000-4000-8000-000000000030";

function createAppointment(overrides: Partial<AppointmentRecord> = {}): AppointmentRecord {
  return {
    id: appointmentId,
    tenantId,
    patientId,
    status: "booked",
    recoveryStatus: "in_progress",
    scheduledAt: new Date("2026-05-10T14:00:00.000Z"),
    ...overrides
  };
}

function createTransition(overrides: Partial<AppointmentRecord> = {}): AppointmentTransitionResult {
  return {
    previous: createAppointment(),
    appointment: createAppointment(overrides)
  };
}

function createPatient(overrides: Partial<PatientRecord> = {}): PatientRecord {
  return {
    id: patientId,
    tenantId,
    ...overrides
  };
}

function createPorts(overrides: Partial<RetentionLifecyclePorts> = {}) {
  const recoveryJobs: RecoveryJobData[] = [];
  const followupJobs: FollowupJobData[] = [];
  const events: LifecycleEventInput[] = [];
  const stateChanges: Omit<LifecycleEventInput, "name">[] = [];
  const audits: RecordAuditLogInput[] = [];
  const scores: UpsertEngagementScoreInput[] = [];
  const ltvRecords: UpsertLtvRecordInput[] = [];

  const ports: RetentionLifecyclePorts = {
    getAppointment: async () => createAppointment(),
    getPatient: async () => createPatient(),
    transitionAppointment: async () => createTransition({ status: "confirmed", recoveryStatus: "succeeded" }),
    scheduleRecoveryJob: async (job) => {
      recoveryJobs.push(job);
    },
    scheduleFollowupJob: async (job) => {
      followupJobs.push(job);
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
    upsertLtvRecord: async (_context, input) => {
      ltvRecords.push(input);
    },
    ...overrides
  };

  return { ports, recoveryJobs, followupJobs, events, stateChanges, audits, scores, ltvRecords };
}

describe("retention lifecycle", () => {
  it("schedules and records measurable recovery attempts", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-5-recovery-attempt" });
    const { ports, recoveryJobs, events, audits, scores } = createPorts();

    await scheduleRecoveryAttemptLifecycle(context, {
      appointmentId,
      attempt: 2,
      reason: "unconfirmed"
    }, ports);

    expect(recoveryJobs[0]).toMatchObject({
      tenantId,
      appointmentId,
      patientId,
      attempt: 2,
      reason: "unconfirmed"
    });
    expect(events.map((event) => event.name)).toEqual(["queue.job_scheduled", "recovery.attempted"]);
    expect(audits[0]).toMatchObject({
      targetId: appointmentId,
      newState: "recovery_attempt_scheduled",
      source: "recovery.attempted"
    });
    expect(scores[0]).toEqual({
      patientId,
      score: 30,
      churnRisk: "high"
    });
  });

  it("records recovery success as a state transition", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-5-recovery-success" });
    const { ports, events, stateChanges, audits, scores } = createPorts();

    const result = await markRecoverySucceededLifecycle(context, { appointmentId }, ports);

    expect(result.appointment).toMatchObject({
      status: "confirmed",
      recoveryStatus: "succeeded"
    });
    expect(events.map((event) => event.name)).toEqual(["recovery.succeeded"]);
    expect(stateChanges).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      source: "recovery.succeeded",
      newState: "confirmed/succeeded"
    });
    expect(scores[0]?.churnRisk).toBe("retained");
  });

  it("records recovery failure as a measurable terminal outcome", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-5-recovery-fail" });
    const { ports, events, stateChanges, audits, scores } = createPorts({
      transitionAppointment: async () => createTransition({ status: "no_show", recoveryStatus: "failed" })
    });

    const result = await markRecoveryFailedLifecycle(context, { appointmentId }, ports);

    expect(result.appointment).toMatchObject({
      status: "no_show",
      recoveryStatus: "failed"
    });
    expect(events.map((event) => event.name)).toEqual(["recovery.failed"]);
    expect(stateChanges).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      source: "recovery.failed",
      newState: "no_show/failed"
    });
    expect(scores[0]?.churnRisk).toBe("high");
  });

  it("completes consultation and schedules post-care follow-ups", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-5-postcare" });
    const { ports, followupJobs, events, stateChanges, audits, scores } = createPorts({
      transitionAppointment: async () => createTransition({ status: "completed" })
    });

    await completeConsultationLifecycle(context, {
      appointmentId,
      postCareDays: [1, 7, 30],
      now: new Date("2026-05-10T15:00:00.000Z")
    }, ports);

    expect(followupJobs.map((job) => job.sequenceDay)).toEqual([1, 7, 30]);
    expect(followupJobs[0]).toMatchObject({
      appointmentId,
      patientId,
      category: "wellness_check",
      scheduledFor: new Date("2026-05-11T15:00:00.000Z")
    });
    expect(events.map((event) => event.name)).toEqual([
      "consultation.completed",
      "queue.job_scheduled",
      "postcare.sequence_scheduled"
    ]);
    expect(stateChanges).toHaveLength(1);
    expect(audits[0]?.source).toBe("consultation.completed");
    expect(scores[0]?.churnRisk).toBe("retained");
  });

  it("monitors prescription renewal through follow-up scheduling", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-5-prescription" });
    const { ports, followupJobs, events, audits, scores } = createPorts();

    await monitorPrescriptionRenewalLifecycle(context, {
      patientId,
      sequenceDay: 3,
      now: new Date("2026-05-10T15:00:00.000Z")
    }, ports);

    expect(followupJobs[0]).toMatchObject({
      patientId,
      category: "prescription",
      sequenceDay: 3,
      scheduledFor: new Date("2026-05-13T15:00:00.000Z")
    });
    expect(events.map((event) => event.name)).toEqual(["prescription.expiring", "queue.job_scheduled"]);
    expect(audits[0]).toMatchObject({
      targetType: "patient",
      source: "prescription.expiring"
    });
    expect(scores[0]?.churnRisk).toBe("moderate");
  });

  it("records patient return and updates LTV", async () => {
    const context = createMockTenantContext({ tenantId, correlationId: "phase-5-return" });
    const { ports, events, stateChanges, audits, scores, ltvRecords } = createPorts();

    await recordPatientReturnedLifecycle(context, {
      patientId,
      source: "prescription_renewal",
      consultationsCompleted: 2,
      avgRevenue: 150,
      prescriptionsRenewed: 1,
      renewalValue: 80
    }, ports);

    expect(events.map((event) => event.name)).toEqual([
      "prescription.renewed",
      "patient.returned",
      "ltv.updated"
    ]);
    expect(ltvRecords[0]).toMatchObject({
      patientId,
      consultationsCompleted: 2,
      avgRevenue: 150,
      prescriptionsRenewed: 1,
      renewalValue: 80
    });
    expect(stateChanges[0]?.payload).toMatchObject({
      newState: "retention_positive",
      reason: "patient.returned"
    });
    expect(audits[0]).toMatchObject({
      targetType: "patient",
      source: "patient.returned"
    });
    expect(scores[0]?.score).toBe(90);
  });

  it("rejects cross-tenant appointment records before recovery fanout", async () => {
    const context = createMockTenantContext({ tenantId });
    const { ports, recoveryJobs, events } = createPorts({
      getAppointment: async () => createAppointment({ tenantId: otherTenantId })
    });

    await expect(scheduleRecoveryAttemptLifecycle(context, {
      appointmentId,
      attempt: 1
    }, ports)).rejects.toThrow("Cross-tenant access denied.");

    expect(recoveryJobs).toHaveLength(0);
    expect(events).toHaveLength(0);
  });
});
