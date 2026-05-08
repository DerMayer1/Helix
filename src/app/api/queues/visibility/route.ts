import { getMockTenantContext } from "@/server/auth/mock";
import { jsonError, jsonOk } from "@/server/http/responses";
import { getCoreQueueVisibility } from "@/server/queues/visibility";

export async function GET() {
  try {
    await getMockTenantContext();
    const visibility = await getCoreQueueVisibility();
    return jsonOk(visibility);
  } catch (error) {
    return jsonError(error);
  }
}
