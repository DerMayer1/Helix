import { createAppointmentLifecyclePorts, markAppointmentUnresponsiveLifecycle } from "@/server/appointments/lifecycle";
import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonError, jsonOk } from "@/server/http/responses";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, routeContext: RouteContext) {
  try {
    const context = await getMockTenantContext();
    const { id } = await routeContext.params;
    const result = await markAppointmentUnresponsiveLifecycle(
      context,
      { appointmentId: id },
      createAppointmentLifecyclePorts(getDb())
    );

    return jsonOk(result.appointment);
  } catch (error) {
    return jsonError(error);
  }
}
