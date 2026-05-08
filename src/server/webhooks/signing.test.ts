import { describe, expect, it } from "vitest";
import {
  createSignedWebhookRequest,
  createWebhookSignature,
  verifyWebhookSignature
} from "./signing";

describe("webhook signing", () => {
  it("creates verifiable HMAC signatures", () => {
    const input = {
      secret: "test-secret-with-enough-length",
      timestamp: "1778200000",
      body: JSON.stringify({ eventName: "state.changed" })
    };

    const signature = createWebhookSignature(input);

    expect(signature).toMatch(/^sha256=/);
    expect(verifyWebhookSignature({ ...input, signature })).toBe(true);
    expect(verifyWebhookSignature({ ...input, body: "tampered", signature })).toBe(false);
  });

  it("creates signed webhook request headers", () => {
    const request = createSignedWebhookRequest({
      secret: "test-secret-with-enough-length",
      payload: { eventName: "state.changed" },
      timestamp: new Date("2026-05-08T12:00:00.000Z")
    });

    expect(request.headers["x-careloop-signature"]).toMatch(/^sha256=/);
    expect(request.headers["x-careloop-timestamp"]).toBe("1778241600");
  });
});

