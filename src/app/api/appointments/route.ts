import { getMockTenantContext } from "@/server/auth/mock";
import { bookAppointmentLifecycle, createAppointmentLifecyclePorts } from "@/server/appointments/lifecycle";
import { getDb } from "@/server/db/client";
import { jsonCreated, jsonError, jsonOk, parseJsonBody } from "@/server/http/responses";
import { listAppointments } from "@/server/repositories/core";

export async function GET() {
  try {
    const context = await getMockTenantContext();
    const appointments = await listAppointments(getDb(), context);
    return jsonOk(appointments);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getMockTenantContext();
    const result = await bookAppointmentLifecycle(
      context,
      await parseJsonBody(request),
      createAppointmentLifecyclePorts(getDb())
    );

    return jsonCreated({
      appointment: result.appointment,
      remindersScheduled: result.reminderJobs.length
    });
  } catch (error) {
    return jsonError(error);
  }
}
