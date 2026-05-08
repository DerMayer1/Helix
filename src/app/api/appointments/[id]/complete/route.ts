import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonError, jsonOk, parseJsonBody } from "@/server/http/responses";
import { completeConsultationLifecycle, createRetentionLifecyclePorts } from "@/server/retention/lifecycle";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getMockTenantContext();
    const { id } = await routeContext.params;
    const body = await parseJsonBody(request);
    const result = await completeConsultationLifecycle(
      context,
      { ...body, appointmentId: id },
      createRetentionLifecyclePorts(getDb())
    );

    return jsonOk({
      appointment: result.transition.appointment,
      followupsScheduled: result.followupJobs.length
    });
  } catch (error) {
    return jsonError(error);
  }
}
