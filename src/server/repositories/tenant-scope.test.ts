import { describe, expect, it } from "vitest";
import { createMockTenantContext } from "@/server/tenant/context";
import {
  ensureTenantScopedMutation,
  findTenantRowById,
  requireTenantRowById,
  scopeRows
} from "./tenant-scope";

const tenantA = "00000000-0000-4000-8000-000000000001";
const tenantB = "00000000-0000-4000-8000-000000000002";

const rows = [
  { id: "patient-a", tenantId: tenantA, displayName: "Synthetic Patient A" },
  { id: "patient-b", tenantId: tenantB, displayName: "Synthetic Patient B" }
] as const;

describe("tenant-scoped repository helpers", () => {
  it("filters rows to the active tenant", () => {
    const context = createMockTenantContext({ tenantId: tenantA });

    expect(scopeRows(context, rows)).toEqual([rows[0]]);
  });

  it("does not find records from another tenant", () => {
    const context = createMockTenantContext({ tenantId: tenantA });

    expect(findTenantRowById(context, rows, "patient-b")).toBeNull();
  });

  it("throws when a required row belongs to another tenant", () => {
    const context = createMockTenantContext({ tenantId: tenantA });

    expect(() => requireTenantRowById(context, rows, "patient-b")).toThrow(
      "Tenant-scoped record not found."
    );
  });

  it("rejects tenant mismatches before mutation", () => {
    const context = createMockTenantContext({ tenantId: tenantA });

    expect(() => ensureTenantScopedMutation(context, rows[1])).toThrow(
      "Cross-tenant access denied."
    );
  });
});

