import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { jsonCreated, jsonError, jsonOk, parseJsonBody } from "@/server/http/responses";
import { createPatient, listPatients } from "@/server/repositories/core";

export async function GET() {
  try {
    const context = await getMockTenantContext();
    const patients = await listPatients(getDb(), context);
    return jsonOk(patients);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getMockTenantContext();
    const patient = await createPatient(getDb(), context, await parseJsonBody(request));
    return jsonCreated(patient);
  } catch (error) {
    return jsonError(error);
  }
}
