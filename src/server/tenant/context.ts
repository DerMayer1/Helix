import { z } from "zod";

export const tenantContextSchema = z.object({
  tenantId: z.string().uuid(),
  actor: z.object({
    id: z.string().uuid().optional(),
    type: z.enum(["user", "job", "webhook", "system"]),
    role: z.enum(["admin", "physician", "staff", "system"]).optional()
  }),
  correlationId: z.string().min(1)
});

export type TenantContext = z.infer<typeof tenantContextSchema>;

export type TenantScopedEntity = {
  tenantId: string;
};

export function createMockTenantContext(overrides: Partial<TenantContext> = {}): TenantContext {
  return tenantContextSchema.parse({
    tenantId: "00000000-0000-4000-8000-000000000001",
    actor: {
      id: "00000000-0000-4000-8000-000000000010",
      type: "user",
      role: "admin"
    },
    correlationId: "mock-correlation-id",
    ...overrides
  });
}

export function requireTenantContext(value: unknown): TenantContext {
  return tenantContextSchema.parse(value);
}

export function assertTenantAccess(context: TenantContext, entity: TenantScopedEntity) {
  if (entity.tenantId !== context.tenantId) {
    throw new Error("Cross-tenant access denied.");
  }
}

export function withTenantId<TInput extends object>(context: TenantContext, input: TInput) {
  return {
    ...input,
    tenantId: context.tenantId
  };
}

