import { describe, expect, it } from "vitest";
import { getQueueVisibility } from "./visibility";

describe("queue visibility", () => {
  it("maps BullMQ counts into dashboard-safe shape", async () => {
    const visibility = await getQueueVisibility("reminders", {
      getJobCounts: async () => ({
        waiting: 2,
        active: 1,
        delayed: 3,
        completed: 5,
        failed: 1,
        paused: 0
      })
    });

    expect(visibility).toEqual({
      name: "reminders",
      waiting: 2,
      active: 1,
      delayed: 3,
      completed: 5,
      failed: 1,
      paused: 0
    });
  });
});

