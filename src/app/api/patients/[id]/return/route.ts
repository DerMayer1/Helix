import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonError, jsonOk, parseJsonBody } from "@/server/http/responses";
import { createRetentionLifecyclePorts, recordPatientReturnedLifecycle } from "@/server/retention/lifecycle";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getMockTenantContext();
    const { id } = await routeContext.params;
    const body = await parseJsonBody(request);
    const patient = await recordPatientReturnedLifecycle(
      context,
      { ...body, patientId: id },
      createRetentionLifecyclePorts(getDb())
    );

    return jsonOk(patient);
  } catch (error) {
    return jsonError(error);
  }
}
