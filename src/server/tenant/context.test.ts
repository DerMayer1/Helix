import { describe, expect, it } from "vitest";
import {
  assertTenantAccess,
  createMockTenantContext,
  requireTenantContext,
  withTenantId
} from "./context";

describe("tenant context", () => {
  it("creates a valid mocked tenant context for local development", () => {
    const context = createMockTenantContext();

    expect(context.tenantId).toBe("00000000-0000-4000-8000-000000000001");
    expect(context.actor.role).toBe("admin");
  });

  it("rejects invalid tenant context", () => {
    expect(() => requireTenantContext({ tenantId: "not-a-uuid" })).toThrow();
  });

  it("adds trusted server-side tenant id to input", () => {
    const context = createMockTenantContext();

    expect(withTenantId(context, { displayName: "Synthetic Patient" })).toEqual({
      tenantId: context.tenantId,
      displayName: "Synthetic Patient"
    });
  });

  it("throws on cross-tenant entity access", () => {
    const context = createMockTenantContext();

    expect(() => assertTenantAccess(context, {
      tenantId: "00000000-0000-4000-8000-000000000002"
    })).toThrow("Cross-tenant access denied.");
  });
});

