import { createMockTenantContext, type TenantContext } from "@/server/tenant/context";

export async function getMockTenantContext(overrides: Partial<TenantContext> = {}) {
  return createMockTenantContext(overrides);
}

