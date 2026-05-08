import { describe, expect, it } from "vitest";
import { assessOutputSafety, assessPromptSafety, createAiFallbackSummary } from "./guardrails";

describe("AI guardrails", () => {
  it("flags possible PHI in prompts", () => {
    const result = assessPromptSafety("Contact patient at synthetic@example.com before appointment.");

    expect(result.safe).toBe(false);
    expect(result.flags[0]).toContain("possible_phi");
  });

  it("allows operational UUIDs in prompts", () => {
    const result = assessPromptSafety([
      "tenant_id=00000000-0000-4000-8000-000000000001",
      "appointment_id=00000000-0000-4000-8000-000000000030",
      "patient_id=00000000-0000-4000-8000-000000000020"
    ].join("\n"));

    expect(result.safe).toBe(true);
  });

  it("flags unsafe clinical output", () => {
    const result = assessOutputSafety("Diagnose the patient and prescribe a dosage.");

    expect(result.safe).toBe(false);
    expect(result.flags.length).toBeGreaterThanOrEqual(2);
  });

  it("creates non-authoritative fallback summaries", () => {
    expect(createAiFallbackSummary("provider unavailable")).toContain("AI assistive context is unavailable.");
  });
});
