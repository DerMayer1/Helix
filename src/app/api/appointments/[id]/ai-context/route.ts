import { createAiClinicalContextPorts, generateClinicalContextLifecycle, scheduleClinicalContextLifecycle } from "@/server/ai/clinical-context";
import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonCreated, jsonError, jsonOk, parseJsonBody } from "@/server/http/responses";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getMockTenantContext();
    const { id } = await routeContext.params;
    const body = await parseJsonBody(request);
    const ports = createAiClinicalContextPorts(getDb());

    if (body.async === true) {
      const result = await scheduleClinicalContextLifecycle(
        context,
        { ...body, appointmentId: id },
        ports
      );

      return jsonCreated({
        appointmentId: result.appointment.id,
        queued: true,
        mode: result.job.mode
      });
    }

    const result = await generateClinicalContextLifecycle(
      context,
      { ...body, appointmentId: id },
      ports
    );

    return jsonOk({
      appointmentId: result.appointment.id,
      status: result.result.status,
      source: result.result.source,
      summary: result.result.summary,
      safetyFlags: result.result.safetyFlags
    });
  } catch (error) {
    return jsonError(error);
  }
}
