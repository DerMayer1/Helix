import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonError, jsonOk, parseJsonBody } from "@/server/http/responses";
import { createRetentionLifecyclePorts, markRecoveryFailedLifecycle } from "@/server/retention/lifecycle";

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getMockTenantContext();
    const { appointmentId } = await routeContext.params;
    const body = await parseJsonBody(request);
    const result = await markRecoveryFailedLifecycle(
      context,
      { ...body, appointmentId },
      createRetentionLifecyclePorts(getDb())
    );

    return jsonOk(result.appointment);
  } catch (error) {
    return jsonError(error);
  }
}
