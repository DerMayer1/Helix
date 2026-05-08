import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonCreated, jsonError, parseJsonBody } from "@/server/http/responses";
import { createRetentionLifecyclePorts, scheduleRecoveryAttemptLifecycle } from "@/server/retention/lifecycle";

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getMockTenantContext();
    const { appointmentId } = await routeContext.params;
    const body = await parseJsonBody(request);
    const result = await scheduleRecoveryAttemptLifecycle(
      context,
      { ...body, appointmentId },
      createRetentionLifecyclePorts(getDb())
    );

    return jsonCreated({
      appointmentId: result.appointment.id,
      attempt: result.job.attempt
    });
  } catch (error) {
    return jsonError(error);
  }
}
