import { describe, expect, it } from "vitest";
import {
  followupJobSchema,
  recoveryJobSchema,
  reminderJobSchema,
  webhookJobSchema
} from "./contracts";

const base = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  correlationId: "test-correlation"
};

describe("queue payload contracts", () => {
  it("validates reminder jobs and coerces scheduled dates", () => {
    const parsed = reminderJobSchema.parse({
      ...base,
      appointmentId: "00000000-0000-4000-8000-000000000030",
      patientId: "00000000-0000-4000-8000-000000000020",
      offset: "24h",
      scheduledFor: "2026-05-10T14:00:00.000Z"
    });

    expect(parsed.scheduledFor).toBeInstanceOf(Date);
  });

  it("rejects invalid recovery attempts", () => {
    expect(() => recoveryJobSchema.parse({
      ...base,
      appointmentId: "00000000-0000-4000-8000-000000000030",
      patientId: "00000000-0000-4000-8000-000000000020",
      attempt: 0,
      reason: "unconfirmed"
    })).toThrow();
  });

  it("validates follow-up jobs and coerces scheduled dates", () => {
    const parsed = followupJobSchema.parse({
      ...base,
      appointmentId: "00000000-0000-4000-8000-000000000030",
      patientId: "00000000-0000-4000-8000-000000000020",
      sequenceDay: 7,
      category: "wellness_check",
      scheduledFor: "2026-05-17T14:00:00.000Z"
    });

    expect(parsed.scheduledFor).toBeInstanceOf(Date);
  });

  it("validates webhook jobs with canonical event names", () => {
    const parsed = webhookJobSchema.parse({
      ...base,
      eventId: "00000000-0000-4000-8000-000000000050",
      eventName: "state.changed",
      subscriptionId: "00000000-0000-4000-8000-000000000040",
      url: "https://example.com/webhooks/careloop",
      payload: {}
    });

    expect(parsed.eventName).toBe("state.changed");
  });
});
