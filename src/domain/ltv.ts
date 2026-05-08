export type LtvInput = {
  consultationsCompleted: number;
  avgRevenue: number;
  prescriptionsRenewed: number;
  renewalValue: number;
};

export function calculateLtv(input: LtvInput) {
  return (
    input.consultationsCompleted * input.avgRevenue +
    input.prescriptionsRenewed * input.renewalValue
  );
}

