export type AiSafetyAssessment = {
  safe: boolean;
  flags: string[];
};

const possiblePhiPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?\d[\s.-]?){10,}\b/,
  /\b\d{3,6}\s+[A-Za-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr)\b/i,
  /\b(?:ssn|social security|medical record number|mrn)\b/i
];

const unsafeClinicalOutputPatterns = [
  /\bdiagnos(?:e|is|ed)\b/i,
  /\bprescrib(?:e|es|ed|ing)\b/i,
  /\bdosage\b/i,
  /\bmust take\b/i,
  /\bconfirmed condition\b/i,
  /\bmedical advice\b/i,
  /\birreversible\b/i
];

function removeOperationalIds(value: string) {
  return value.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "[uuid]"
  );
}

export function assessPromptSafety(prompt: string): AiSafetyAssessment {
  const promptWithoutOperationalIds = removeOperationalIds(prompt);
  const flags = possiblePhiPatterns
    .filter((pattern) => pattern.test(promptWithoutOperationalIds))
    .map((pattern) => `possible_phi:${pattern.source}`);

  return {
    safe: flags.length === 0,
    flags
  };
}

export function assessOutputSafety(output: string): AiSafetyAssessment {
  const flags = unsafeClinicalOutputPatterns
    .filter((pattern) => pattern.test(output))
    .map((pattern) => `unsafe_clinical_claim:${pattern.source}`);

  return {
    safe: flags.length === 0,
    flags
  };
}

export function createAiFallbackSummary(reason: string) {
  return [
    "AI assistive context is unavailable.",
    `Fallback reason: ${reason}.`,
    "Review tenant-scoped appointment status, recovery status, engagement score, and LTV records directly before making care decisions."
  ].join(" ");
}
