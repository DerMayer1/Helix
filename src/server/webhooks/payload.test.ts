import { describe, expect, it } from "vitest";
import { createWebhookEnvelope, minimizeWebhookData } from "./payload";

describe("webhook payloads", () => {
  it("removes PHI-like fields from webhook data", () => {
    expect(minimizeWebhookData({
      patientId: "00000000-0000-4000-8000-000000000020",
      email: "patient@example.com",
      rawPatientMessage: "Sensitive text",
      recoveryStatus: "succeeded"
    })).toEqual({
      patientId: "00000000-0000-4000-8000-000000000020",
      recoveryStatus: "succeeded"
    });
  });

  it("creates tenant-scoped event envelopes", () => {
    const envelope = createWebhookEnvelope({
      eventId: "00000000-0000-4000-8000-000000000050",
      eventName: "recovery.succeeded",
      tenantId: "00000000-0000-4000-8000-000000000001",
      entityType: "appointment",
      entityId: "00000000-0000-4000-8000-000000000030",
      correlationId: "test-correlation",
      occurredAt: new Date("2026-05-08T12:00:00.000Z"),
      payload: { email: "patient@example.com", recoveryStatus: "succeeded" }
    });

    expect(envelope.data).toEqual({ recoveryStatus: "succeeded" });
    expect(envelope.occurredAt).toBe("2026-05-08T12:00:00.000Z");
  });
});

