import { describe, expect, it, vi } from "vitest";
import { scheduleRecoveryJob, scheduleReminderJob, scheduleWebhookJob } from "./scheduler";

const base = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  correlationId: "test-correlation"
};

function createQueue() {
  return {
    add: vi.fn(async (_name: string, _data: unknown, options: unknown) => ({ options }))
  };
}

describe("queue scheduler", () => {
  it("schedules reminders with deterministic job ids", async () => {
    const queue = createQueue();
    await scheduleReminderJob({
      ...base,
      appointmentId: "00000000-0000-4000-8000-000000000030",
      patientId: "00000000-0000-4000-8000-000000000020",
      offset: "24h",
      scheduledFor: new Date(Date.now() + 60_000)
    }, queue);

    expect(queue.add).toHaveBeenCalledOnce();
    expect(queue.add.mock.calls[0]?.[2]).toMatchObject({
      jobId: "reminder:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000030:24h",
      attempts: 3
    });
  });

  it("schedules recovery attempts with attempt-specific ids", async () => {
    const queue = createQueue();
    await scheduleRecoveryJob({
      ...base,
      appointmentId: "00000000-0000-4000-8000-000000000030",
      patientId: "00000000-0000-4000-8000-000000000020",
      attempt: 2,
      reason: "unconfirmed"
    }, queue);

    expect(queue.add.mock.calls[0]?.[2]).toMatchObject({
      jobId: "recovery:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000030:2"
    });
  });

  it("schedules webhook jobs with stronger retry defaults", async () => {
    const queue = createQueue();
    await scheduleWebhookJob({
      ...base,
      eventId: "00000000-0000-4000-8000-000000000050",
      eventName: "state.changed",
      subscriptionId: "00000000-0000-4000-8000-000000000040",
      url: "https://example.com/webhooks/careloop",
      payload: {}
    }, queue);

    expect(queue.add.mock.calls[0]?.[2]).toMatchObject({
      attempts: 5,
      jobId: "webhook:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000040:00000000-0000-4000-8000-000000000050"
    });
  });
});

