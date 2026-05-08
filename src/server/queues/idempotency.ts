function normalizeSegment(segment: string | number | Date) {
  if (segment instanceof Date) {
    return segment.toISOString();
  }

  return String(segment)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createIdempotencyKey(prefix: string, segments: Array<string | number | Date>) {
  return [prefix, ...segments].map(normalizeSegment).join(":");
}

export function createReminderJobId(input: {
  tenantId: string;
  appointmentId: string;
  offset: string;
}) {
  return createIdempotencyKey("reminder", [input.tenantId, input.appointmentId, input.offset]);
}

export function createRecoveryJobId(input: {
  tenantId: string;
  appointmentId: string;
  attempt: number;
}) {
  return createIdempotencyKey("recovery", [input.tenantId, input.appointmentId, input.attempt]);
}

export function createWebhookJobId(input: {
  tenantId: string;
  subscriptionId: string;
  eventId: string;
}) {
  return createIdempotencyKey("webhook", [input.tenantId, input.subscriptionId, input.eventId]);
}

export function createFollowupJobId(input: {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  sequenceDay: number;
  category?: string;
}) {
  return createIdempotencyKey("followup", [
    input.tenantId,
    input.patientId,
    input.appointmentId ?? "patient",
    input.sequenceDay,
    input.category ?? "general"
  ]);
}

export function createAiClinicalContextJobId(input: {
  tenantId: string;
  appointmentId: string;
  mode: string;
}) {
  return createIdempotencyKey("ai-context", [input.tenantId, input.appointmentId, input.mode]);
}
