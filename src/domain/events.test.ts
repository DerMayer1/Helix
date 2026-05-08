import { describe, expect, it } from "vitest";
import { canonicalLifecycleEvents } from "./events";

describe("canonicalLifecycleEvents", () => {
  it("includes discrete recovery outcome events for audit and dashboard metrics", () => {
    expect(canonicalLifecycleEvents).toContain("recovery.attempted");
    expect(canonicalLifecycleEvents).toContain("recovery.succeeded");
    expect(canonicalLifecycleEvents).toContain("recovery.failed");
  });

  it("includes lifecycle-wide state change and LTV events", () => {
    expect(canonicalLifecycleEvents).toContain("state.changed");
    expect(canonicalLifecycleEvents).toContain("ltv.updated");
  });
});

