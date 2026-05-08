import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonCreated, jsonError, parseJsonBody } from "@/server/http/responses";
import { createRetentionLifecyclePorts, monitorPrescriptionRenewalLifecycle } from "@/server/retention/lifecycle";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getMockTenantContext();
    const { id } = await routeContext.params;
    const body = await parseJsonBody(request);
    const result = await monitorPrescriptionRenewalLifecycle(
      context,
      { ...body, patientId: id },
      createRetentionLifecyclePorts(getDb())
    );

    return jsonCreated({
      patientId: result.patient.id,
      sequenceDay: result.job.sequenceDay
    });
  } catch (error) {
    return jsonError(error);
  }
}
