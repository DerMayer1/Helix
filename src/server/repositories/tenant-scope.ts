import type { TenantContext, TenantScopedEntity } from "@/server/tenant/context";
import { assertTenantAccess } from "@/server/tenant/context";

export function scopeRows<TEntity extends TenantScopedEntity>(
  context: TenantContext,
  rows: readonly TEntity[]
) {
  return rows.filter((row) => row.tenantId === context.tenantId);
}

export function findTenantRowById<TEntity extends TenantScopedEntity & { id: string }>(
  context: TenantContext,
  rows: readonly TEntity[],
  id: string
) {
  return scopeRows(context, rows).find((row) => row.id === id) ?? null;
}

export function requireTenantRowById<TEntity extends TenantScopedEntity & { id: string }>(
  context: TenantContext,
  rows: readonly TEntity[],
  id: string
) {
  const scopedRow = findTenantRowById(context, rows, id);

  if (!scopedRow) {
    throw new Error("Tenant-scoped record not found.");
  }

  return scopedRow;
}

export function ensureTenantScopedMutation<TEntity extends TenantScopedEntity>(
  context: TenantContext,
  entity: TEntity
) {
  assertTenantAccess(context, entity);
  return entity;
}

