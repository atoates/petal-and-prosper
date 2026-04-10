"use client";

import { roleCan, asRole, type Permission, type Role } from "./permissions";

/**
 * Pure client-side predicate. Does NOT read from a context - the parent
 * server component is expected to fetch the current role (via
 * `getCurrentRole()` in permissions-server) and pass it down as a prop.
 *
 * This avoids having to wire up next-auth's SessionProvider just to
 * gate UI. It also matches the rest of the app's pattern of passing
 * session-derived data as props from server components.
 *
 * Usage:
 *   // in a server page
 *   const role = await getCurrentRole();
 *   return <MyClientComponent role={role} ... />
 *
 *   // in the client component
 *   const canDelete = can(role, "orders:delete");
 */
export function can(
  role: Role | string | null | undefined,
  permission: Permission
): boolean {
  const normalised =
    typeof role === "string" && role !== "admin" && role !== "manager" && role !== "staff"
      ? asRole(role)
      : (role as Role | null | undefined) ?? null;
  return roleCan(normalised, permission);
}
