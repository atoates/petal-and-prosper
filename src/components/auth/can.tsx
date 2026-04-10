"use client";

import { ReactNode } from "react";
import { can } from "@/lib/auth/permissions-client";
import type { Permission, Role } from "@/lib/auth/permissions";

interface CanProps {
  role: Role | string | null | undefined;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders `children` iff `role` has `permission`, otherwise renders
 * `fallback` (default: nothing).
 *
 * `role` should be passed in from the parent server component. See
 * `permissions-server.ts` for how to fetch it.
 *
 * This is a UI affordance only. Server actions MUST still call
 * `requirePermission` - do not rely on the UI hiding a button to
 * enforce security.
 *
 * Usage:
 *   // in a server page
 *   const role = await getCurrentRole();
 *   <MyClientComponent role={role} />
 *
 *   // inside MyClientComponent
 *   <Can role={role} permission="orders:delete">
 *     <DeleteOrderButton />
 *   </Can>
 */
export function Can({ role, permission, children, fallback = null }: CanProps) {
  return <>{can(role, permission) ? children : fallback}</>;
}
