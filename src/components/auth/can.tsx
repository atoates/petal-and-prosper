"use client";

import { ReactNode } from "react";
import { can } from "@/lib/auth/permissions-client";
import type { Permission, Role } from "@/lib/auth/permissions";
import { useRole } from "./role-provider";

interface CanProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Optional explicit role. If omitted, reads from the `<RoleProvider>`
   * ancestor (mounted at the dashboard layout). Most call sites should
   * omit this and rely on context.
   */
  role?: Role | string | null | undefined;
}

/**
 * Renders `children` iff the current role has `permission`, otherwise
 * renders `fallback` (default: nothing).
 *
 * This is a UI affordance only. Server routes / actions MUST still call
 * `requirePermissionApi` / `requirePermission` - do not rely on hiding
 * a button to keep an action safe.
 */
export function Can({ role, permission, children, fallback = null }: CanProps) {
  const contextRole = useRole();
  const effective = role !== undefined ? role : contextRole;
  return <>{can(effective, permission) ? children : fallback}</>;
}
