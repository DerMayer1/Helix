import { describe, expect, it } from "vitest";
import { buildReminderJobs, calculateReminderSchedule } from "./reminders";

const tenantId = "00000000-0000-4000-8000-000000000001";
const patientId = "00000000-0000-4000-8000-000000000020";
const appointmentId = "00000000-0000-4000-8000-000000000030";

describe("appointment reminder planning", () => {
  it("calculates the canonical reminder offsets", () => {
    const scheduledAt = new Date("2026-05-10T14:00:00.000Z");

    expect(calculateReminderSchedule(scheduledAt)).toEqual([
      { offset: "48h", scheduledFor: new Date("2026-05-08T14:00:00.000Z") },
      { offset: "24h", scheduledFor: new Date("2026-05-09T14:00:00.000Z") },
      { offset: "2h", scheduledFor: new Date("2026-05-10T12:00:00.000Z") },
      { offset: "30m", scheduledFor: new Date("2026-05-10T13:30:00.000Z") }
    ]);
  });

  it("builds tenant-scoped BullMQ reminder payloads and skips stale reminders", () => {
    const jobs = buildReminderJobs({
      tenantId,
      correlationId: "test-correlation",
      appointmentId,
      patientId,
      scheduledAt: new Date("2026-05-10T14:00:00.000Z"),
      now: new Date("2026-05-09T13:00:00.000Z")
    });

    expect(jobs).toHaveLength(3);
    expect(jobs[0]).toMatchObject({
      tenantId,
      appointmentId,
      patientId,
      offset: "24h"
    });
  });
});
