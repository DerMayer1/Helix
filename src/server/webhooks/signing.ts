import { createHmac, timingSafeEqual } from "node:crypto";

const signaturePrefix = "sha256=";

export function createWebhookSignature(input: {
  secret: string;
  timestamp: string;
  body: string;
}) {
  const digest = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.body}`)
    .digest("hex");

  return `${signaturePrefix}${digest}`;
}

export function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
}) {
  const expected = createWebhookSignature(input);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(input.signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function createSignedWebhookRequest(input: {
  secret: string;
  payload: unknown;
  timestamp?: Date;
}) {
  const timestamp = Math.floor((input.timestamp ?? new Date()).getTime() / 1000).toString();
  const body = JSON.stringify(input.payload);

  return {
    body,
    headers: {
      "content-type": "application/json",
      "x-careloop-timestamp": timestamp,
      "x-careloop-signature": createWebhookSignature({
        secret: input.secret,
        timestamp,
        body
      })
    }
  };
}

