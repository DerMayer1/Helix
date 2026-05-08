import { getMockTenantContext } from "@/server/auth/mock";
import { getDb } from "@/server/db/client";
import { emitLifecycleEvent, emitStateChanged } from "@/server/events/emitter";
import { jsonCreated, jsonError, jsonOk, parseJsonBody } from "@/server/http/responses";
import { createAutomationRule, listAutomationRules, recordAuditLog } from "@/server/repositories/core";

export async function GET() {
  try {
    const context = await getMockTenantContext();
    const rules = await listAutomationRules(getDb(), context);
    return jsonOk(rules);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getMockTenantContext();
    const rule = await createAutomationRule(getDb(), context, await parseJsonBody(request));

    await emitLifecycleEvent(getDb(), context, {
      name: "automation.rules_configured",
      entityType: "automation_rule",
      entityId: rule.id,
      payload: {
        enabled: rule.enabled
      }
    });

    await emitStateChanged(getDb(), context, {
      entityType: "automation_rule",
      entityId: rule.id,
      payload: {
        previousState: null,
        newState: rule.enabled ? "enabled" : "disabled",
        reason: "automation.rules_configured"
      }
    });

    await recordAuditLog(getDb(), context, {
      actorType: context.actor.type,
      actorId: context.actor.id,
      targetType: "automation_rule",
      targetId: rule.id,
      newState: rule.enabled ? "enabled" : "disabled",
      source: "automation.rules_configured",
      correlationId: context.correlationId
    });

    return jsonCreated(rule);
  } catch (error) {
    return jsonError(error);
  }
}
