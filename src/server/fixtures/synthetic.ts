import type { CreateAppointmentInput, CreateAutomationRuleInput, CreatePatientInput } from "@/server/validation/core";

export const syntheticTenantId = "00000000-0000-4000-8000-000000000001";
export const syntheticPatientId = "00000000-0000-4000-8000-000000000020";

export const syntheticPatient: CreatePatientInput = {
  displayName: "Synthetic Patient",
  contactPreference: "email"
};

export const syntheticAutomationRule: CreateAutomationRuleInput = {
  name: "Default Retention Loop",
  enabled: true,
  reminderSchedule: {
    offsets: ["48h", "24h", "2h", "30m"]
  },
  recoveryBehavior: {
    maxAttempts: 3,
    channels: ["email"]
  },
  postCareSequence: {
    days: [1, 7, 30]
  },
  webhookSubscriptions: {
    events: ["state.changed", "recovery.succeeded", "recovery.failed"]
  }
};

export const syntheticAppointment: CreateAppointmentInput = {
  patientId: syntheticPatientId,
  scheduledAt: new Date("2026-05-10T14:00:00.000Z")
};

