import "server-only";
import { NextResponse } from "next/server";
import type { Permission, AuthContext } from "./permissions";
import { requirePermission, requireSession } from "./permissions-server";

export type ApiGate = { ctx: AuthContext } | { response: NextResponse };

function toResponse(error: { success: false; error: string }): NextResponse {
  const status = error.error === "Forbidden" ? 403 : 401;
  return NextResponse.json(error, { status });
}

/**
 * Route-handler variant of `requirePermission`. Use at the top of every
 * mutating or tenant-scoped API route:
 *
 *   const gate = await requirePermissionApi("orders:delete");
 *   if ("response" in gate) return gate.response;
 *   const { ctx } = gate;
 *   // ...ctx.companyId, ctx.userId, ctx.role are guaranteed to exist
 *
 * `ctx.companyId` comes straight from the verified session, so this
 * replaces the old `getCompanyId()` helper that had a dangerous
 * "fall back to first company" path.
 */
export async function requirePermissionApi(permission: Permission): Promise<ApiGate> {
  const gate = await requirePermission(permission);
  if ("error" in gate) {
    return { response: toResponse(gate.error) };
  }
  return { ctx: gate.ctx };
}

/**
 * Session-only gate for routes that don't need a specific permission
 * (e.g. "read the currently authed user's own profile"). Still
 * guarantees a valid session and a tenant context.
 */
export async function requireSessionApi(): Promise<ApiGate> {
  const gate = await requireSession();
  if ("error" in gate) {
    return { response: toResponse(gate.error) };
  }
  return { ctx: gate.ctx };
}
