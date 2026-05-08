import type { ReminderJobData } from "@/server/queues/contracts";

export const defaultReminderOffsets = ["48h", "24h", "2h", "30m"] as const;

export type ReminderOffset = (typeof defaultReminderOffsets)[number];

const reminderOffsetMs: Record<ReminderOffset, number> = {
  "48h": 48 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "30m": 30 * 60 * 1000
};

export type BuildReminderJobsInput = {
  tenantId: string;
  correlationId: string;
  appointmentId: string;
  patientId: string;
  scheduledAt: Date;
  offsets?: readonly ReminderOffset[];
  now?: Date;
};

export function calculateReminderSchedule(
  scheduledAt: Date,
  offsets: readonly ReminderOffset[] = defaultReminderOffsets
) {
  return offsets.map((offset) => ({
    offset,
    scheduledFor: new Date(scheduledAt.getTime() - reminderOffsetMs[offset])
  }));
}

export function buildReminderJobs(input: BuildReminderJobsInput): ReminderJobData[] {
  const now = input.now ?? new Date();

  return calculateReminderSchedule(input.scheduledAt, input.offsets)
    .filter((reminder) => reminder.scheduledFor.getTime() >= now.getTime())
    .map((reminder) => ({
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      offset: reminder.offset,
      scheduledFor: reminder.scheduledFor
    }));
}
