import { describe, expect, it } from "vitest";
import {
  createAiClinicalContextJobId,
  createFollowupJobId,
  createRecoveryJobId,
  createReminderJobId,
  createWebhookJobId
} from "./idempotency";

describe("queue idempotency keys", () => {
  it("creates stable reminder job ids", () => {
    const input = {
      tenantId: "00000000-0000-4000-8000-000000000001",
      appointmentId: "00000000-0000-4000-8000-000000000030",
      offset: "24h"
    };

    expect(createReminderJobId(input)).toBe(createReminderJobId(input));
    expect(createReminderJobId(input)).toContain("reminder:");
  });

  it("separates recovery attempts", () => {
    const base = {
      tenantId: "00000000-0000-4000-8000-000000000001",
      appointmentId: "00000000-0000-4000-8000-000000000030"
    };

    expect(createRecoveryJobId({ ...base, attempt: 1 })).not.toBe(
      createRecoveryJobId({ ...base, attempt: 2 })
    );
  });

  it("uses event and subscription identity for webhook jobs", () => {
    expect(createWebhookJobId({
      tenantId: "00000000-0000-4000-8000-000000000001",
      subscriptionId: "00000000-0000-4000-8000-000000000040",
      eventId: "00000000-0000-4000-8000-000000000050"
    })).toBe("webhook:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000040:00000000-0000-4000-8000-000000000050");
  });

  it("creates follow-up ids by patient, appointment, sequence day, and category", () => {
    expect(createFollowupJobId({
      tenantId: "00000000-0000-4000-8000-000000000001",
      patientId: "00000000-0000-4000-8000-000000000020",
      appointmentId: "00000000-0000-4000-8000-000000000030",
      sequenceDay: 7,
      category: "wellness_check"
    })).toBe("followup:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000020:00000000-0000-4000-8000-000000000030:7:wellness_check");
  });

  it("creates AI clinical context ids by appointment and mode", () => {
    expect(createAiClinicalContextJobId({
      tenantId: "00000000-0000-4000-8000-000000000001",
      appointmentId: "00000000-0000-4000-8000-000000000030",
      mode: "pre_consultation"
    })).toBe("ai-context:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000030:pre_consultation");
  });
});
