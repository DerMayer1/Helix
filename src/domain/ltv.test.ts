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

  it("returns consultation revenue when there are no renewals", () => {
    expect(
      calculateLtv({
        consultationsCompleted: 4,
        avgRevenue: 150,
        prescriptionsRenewed: 0,
        renewalValue: 75
      })
    ).toBe(600);
  });

  it("returns renewal revenue when there are no completed consultations", () => {
    expect(
      calculateLtv({
        consultationsCompleted: 0,
        avgRevenue: 200,
        prescriptionsRenewed: 3,
        renewalValue: 45
      })
    ).toBe(135);
  });

  it("returns zero for patients without completed value events", () => {
    expect(
      calculateLtv({
        consultationsCompleted: 0,
        avgRevenue: 180,
        prescriptionsRenewed: 0,
        renewalValue: 40
      })
    ).toBe(0);
  });
});
