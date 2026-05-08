import { describe, expect, it } from "vitest";
import { calculateLtv } from "./ltv";

describe("calculateLtv", () => {
  it("combines completed consultations and prescription renewals", () => {
    expect(
      calculateLtv({
        consultationsCompleted: 3,
        avgRevenue: 180,
        prescriptionsRenewed: 2,
        renewalValue: 40
      })
    ).toBe(620);
  });
});

