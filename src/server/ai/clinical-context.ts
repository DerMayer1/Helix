import type { LifecycleEventName } from "@/domain/events";
import type { AppointmentRecord, LifecycleEventInput } from "@/server/appointments/lifecycle";
import { emitLifecycleEvent, emitStateChanged, type WebhookSubscriptionConfig } from "@/server/events/emitter";
import {
  getAppointmentById,
  recordAiClinicalContext,
  recordAuditLog,
  type CareLoopDb
} from "@/server/repositories/core";
import { scheduleAiClinicalContextJob } from "@/server/queues/scheduler";
import type { AiClinicalContextJobData } from "@/server/queues/contracts";
import { assertTenantAccess, type TenantContext } from "@/server/tenant/context";
import {
  generateClinicalContextSchema,
  type AiClinicalContextResultInput,
  type GenerateClinicalContextInput,
  type RecordAuditLogInput
} from "@/server/validation/core";
import { assessOutputSafety, assessPromptSafety, createAiFallbackSummary } from "./guardrails";

export type AiClinicalContextMode = "pre_consultation" | "post_consultation";

export type AiClinicalContextProviderInput = {
  prompt: string;
  mode: AiClinicalContextMode;
};

export type AiClinicalContextProviderOutput = {
  summary: string;
  source?: "deterministic" | "guarded_ai" | "fallback";
};

export type AiClinicalContextProvider = {
  generate: (input: AiClinicalContextProviderInput) => Promise<AiClinicalContextProviderOutput>;
};

export type AiClinicalContextPorts = {
  getAppointment: (context: TenantContext, appointmentId: string) => Promise<AppointmentRecord | null>;
  scheduleAiClinicalContextJob: (job: AiClinicalContextJobData) => Promise<unknown>;
  recordAiClinicalContext: (context: TenantContext, input: AiClinicalContextResultInput) => Promise<unknown>;
  emitLifecycleEvent: (context: TenantContext, input: LifecycleEventInput) => Promise<unknown>;
  emitStateChanged: (context: TenantContext, input: Omit<LifecycleEventInput, "name">) => Promise<unknown>;
  recordAuditLog: (context: TenantContext, input: RecordAuditLogInput) => Promise<unknown>;
};

export type GenerateClinicalContextLifecycleInput = GenerateClinicalContextInput & {
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[];
};

export const deterministicClinicalContextProvider: AiClinicalContextProvider = {
  async generate(input) {
    return {
      source: "deterministic",
      summary: [
        "Assistive operational context only.",
        `Mode: ${input.mode}.`,
        "Review appointment state, recovery state, engagement risk, and retention signals before consultation."
      ].join(" ")
    };
  }
};

export function createAiClinicalContextPorts(db: CareLoopDb): AiClinicalContextPorts {
  return {
    getAppointment: (context, appointmentId) => getAppointmentById(db, context, appointmentId),
    scheduleAiClinicalContextJob,
    recordAiClinicalContext: (context, input) => recordAiClinicalContext(db, context, input),
    emitLifecycleEvent: (context, input) => emitLifecycleEvent(db, context, input),
    emitStateChanged: (context, input) => emitStateChanged(db, context, input),
    recordAuditLog: (context, input) => recordAuditLog(db, context, input)
  };
}

export function buildClinicalContextPrompt(input: {
  context: TenantContext;
  appointment: AppointmentRecord;
  mode: AiClinicalContextMode;
}) {
  return [
    "Generate assistive clinical workflow context for a doctor.",
    "Do not diagnose, prescribe, recommend dosage, or make irreversible decisions.",
    "Use only tenant-scoped operational identifiers and lifecycle state.",
    `tenant_id=${input.context.tenantId}`,
    `appointment_id=${input.appointment.id}`,
    `patient_id=${input.appointment.patientId}`,
    `appointment_status=${input.appointment.status}`,
    `recovery_status=${input.appointment.recoveryStatus}`,
    `scheduled_at=${input.appointment.scheduledAt.toISOString()}`,
    `mode=${input.mode}`
  ].join("\n");
}

export async function scheduleClinicalContextLifecycle(
  context: TenantContext,
  input: GenerateClinicalContextLifecycleInput,
  ports: AiClinicalContextPorts
) {
  const parsed = generateClinicalContextSchema.parse(input);
  const appointment = await requireAppointment(context, parsed.appointmentId, ports);
  const job: AiClinicalContextJobData = {
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    mode: parsed.mode
  };

  await ports.scheduleAiClinicalContextJob(job);
  await emitEvent(context, ports, "queue.job_scheduled", "appointment", appointment.id, {
    queue: "ai-clinical-context",
    mode: parsed.mode,
    patientId: appointment.patientId
  }, input.webhookSubscriptions);
  await audit(context, ports, appointment.id, "ai_context_scheduled", "queue.job_scheduled");

  return { appointment, job };
}

export async function generateClinicalContextLifecycle(
  context: TenantContext,
  input: GenerateClinicalContextLifecycleInput,
  ports: AiClinicalContextPorts,
  provider: AiClinicalContextProvider = deterministicClinicalContextProvider
) {
  const parsed = generateClinicalContextSchema.parse(input);
  const appointment = await requireAppointment(context, parsed.appointmentId, ports);
  const prompt = buildClinicalContextPrompt({ context, appointment, mode: parsed.mode });
  const promptSafety = assessPromptSafety(prompt);

  if (!promptSafety.safe) {
    return persistClinicalContextResult(context, ports, appointment, {
      status: "rejected",
      source: "fallback",
      summary: createAiFallbackSummary("prompt safety guard rejected context"),
      safetyFlags: { prompt: promptSafety.flags }
    }, input.webhookSubscriptions);
  }

  const providerOutput = await provider.generate({ prompt, mode: parsed.mode }).catch((error: unknown) => ({
    source: "fallback" as const,
    summary: createAiFallbackSummary(error instanceof Error ? error.message : "provider failure")
  }));
  const outputSafety = assessOutputSafety(providerOutput.summary);

  if (!outputSafety.safe) {
    return persistClinicalContextResult(context, ports, appointment, {
      status: "rejected",
      source: "fallback",
      summary: createAiFallbackSummary("unsafe AI output rejected"),
      safetyFlags: { output: outputSafety.flags }
    }, input.webhookSubscriptions);
  }

  const fallback = providerOutput.summary.includes("AI assistive context is unavailable.");

  return persistClinicalContextResult(context, ports, appointment, {
    status: fallback ? "fallback" : "generated",
    source: fallback ? "fallback" : providerOutput.source ?? "guarded_ai",
    summary: providerOutput.summary,
    safetyFlags: {
      prompt: promptSafety.flags,
      output: outputSafety.flags
    }
  }, input.webhookSubscriptions);
}

async function persistClinicalContextResult(
  context: TenantContext,
  ports: AiClinicalContextPorts,
  appointment: AppointmentRecord,
  result: Pick<AiClinicalContextResultInput, "status" | "source" | "summary" | "safetyFlags">,
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[]
) {
  await ports.recordAiClinicalContext(context, {
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    ...result
  });
  await emitEvent(context, ports, "consultation.context_generated", "appointment", appointment.id, {
    patientId: appointment.patientId,
    status: result.status,
    source: result.source,
    safetyFlags: result.safetyFlags
  }, webhookSubscriptions);
  await ports.emitStateChanged(context, {
    entityType: "appointment",
    entityId: appointment.id,
    payload: {
      previousState: appointment.status,
      newState: appointment.status,
      reason: "consultation.context_generated"
    },
    webhookSubscriptions
  });
  await audit(context, ports, appointment.id, `ai_context_${result.status}`, "consultation.context_generated");

  return {
    appointment,
    result
  };
}

async function requireAppointment(
  context: TenantContext,
  appointmentId: string,
  ports: AiClinicalContextPorts
) {
  const appointment = await ports.getAppointment(context, appointmentId);

  if (!appointment) {
    throw new Error("Tenant-scoped appointment not found.");
  }

  assertTenantAccess(context, appointment);
  return appointment;
}

async function emitEvent(
  context: TenantContext,
  ports: AiClinicalContextPorts,
  name: LifecycleEventName,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  webhookSubscriptions?: readonly WebhookSubscriptionConfig[]
) {
  await ports.emitLifecycleEvent(context, {
    name,
    entityType,
    entityId,
    payload,
    webhookSubscriptions
  });
}

async function audit(
  context: TenantContext,
  ports: AiClinicalContextPorts,
  targetId: string,
  newState: string,
  source: LifecycleEventName
) {
  await ports.recordAuditLog(context, {
    actorType: context.actor.type,
    actorId: context.actor.id,
    targetType: "appointment",
    targetId,
    newState,
    source,
    correlationId: context.correlationId
  });
}
