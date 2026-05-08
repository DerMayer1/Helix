import { describe, expect, it } from "vitest";
import {
  createAppointmentSchema,
  createAutomationRuleSchema,
  completeConsultationSchema,
  patientReturnedSchema,
  recordLifecycleEventSchema,
  scheduleRecoveryAttemptSchema,
  transitionAppointmentSchema,
  upsertLtvRecordSchema
} from "./core";

describe("core validation schemas", () => {
  it("validates automation rules without PHI-bearing patient data", () => {
    const parsed = createAutomationRuleSchema.parse({
      name: "Default Retention Loop",
      reminderSchedule: { offsets: ["48h", "24h", "2h", "30m"] },
      recoveryBehavior: { maxAttempts: 3 },
      postCareSequence: { days: [1, 7, 30] },
      webhookSubscriptions: { events: ["state.changed"] }
    });

    expect(parsed.enabled).toBe(true);
  });

  it("coerces appointment schedule dates", () => {
    const parsed = createAppointmentSchema.parse({
      patientId: "00000000-0000-4000-8000-000000000020",
      scheduledAt: "2026-05-10T14:00:00.000Z"
    });

    expect(parsed.scheduledAt).toBeInstanceOf(Date);
  });

  it("accepts canonical recovery outcome events", () => {
    const parsed = recordLifecycleEventSchema.parse({
      name: "recovery.succeeded",
      entityType: "appointment",
      entityId: "00000000-0000-4000-8000-000000000030",
      correlationId: "test-correlation",
      payload: {}
    });

    expect(parsed.name).toBe("recovery.succeeded");
  });

  it("requires an explicit appointment transition field", () => {
    expect(() => transitionAppointmentSchema.parse({
      appointmentId: "00000000-0000-4000-8000-000000000030"
    })).toThrow("At least one appointment state field must be provided.");
  });

  it("validates recovery attempts with default unconfirmed reason", () => {
    const parsed = scheduleRecoveryAttemptSchema.parse({
      appointmentId: "00000000-0000-4000-8000-000000000030",
      attempt: 1
    });

    expect(parsed.reason).toBe("unconfirmed");
  });

  it("validates post-care sequence days", () => {
    const parsed = completeConsultationSchema.parse({
      appointmentId: "00000000-0000-4000-8000-000000000030",
      postCareDays: [1, 7, 30]
    });

    expect(parsed.postCareDays).toEqual([1, 7, 30]);
  });

  it("validates patient return LTV signals", () => {
    const parsed = patientReturnedSchema.parse({
      patientId: "00000000-0000-4000-8000-000000000020",
      consultationsCompleted: 1,
      avgRevenue: 150,
      prescriptionsRenewed: 1,
      renewalValue: 80
    });

    expect(parsed.source).toBe("return_visit");
  });

  it("rejects negative LTV inputs", () => {
    expect(() => upsertLtvRecordSchema.parse({
      patientId: "00000000-0000-4000-8000-000000000020",
      consultationsCompleted: 1,
      avgRevenue: -1,
      prescriptionsRenewed: 0,
      renewalValue: 0
    })).toThrow();
  });
});
