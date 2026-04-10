import "server-only";
import { auth } from "@/auth";
import {
  roleCan,
  asRole,
  type Permission,
  type AuthContext,
  type AuthError,
} from "./permissions";

/**
 * Server-side guard used at the top of every server action.
 *
 * Returns either a { ctx } object (on success) or an { error } object
 * (on failure) so the caller can do:
 *
 *   const gate = await requirePermission("orders:delete");
 *   if ("error" in gate) return gate.error;
 *   const { ctx } = gate;
 *
 * The shape matches the existing `{ success: false, error: string }`
 * convention used by the rest of the app.
 */
export async function requirePermission(
  permission: Permission
): Promise<{ ctx: AuthContext } | { error: AuthError }> {
  const session = await auth();

  const userId = session?.user?.id;
  const companyId = session?.user?.companyId;
  const role = asRole(session?.user?.role);

  if (!session?.user || !userId || !companyId || !role) {
    return { error: { success: false, error: "Unauthorized" } };
  }

  if (!roleCan(role, permission)) {
    return { error: { success: false, error: "Forbidden" } };
  }

  return { ctx: { userId, companyId, role } };
}

/**
 * Thin variant for actions that only need the session (no permission check).
 */
export async function requireSession(): Promise<
  { ctx: AuthContext } | { error: AuthError }
> {
  const session = await auth();
  const userId = session?.user?.id;
  const companyId = session?.user?.companyId;
  const role = asRole(session?.user?.role);

  if (!session?.user || !userId || !companyId || !role) {
    return { error: { success: false, error: "Unauthorized" } };
  }
  return { ctx: { userId, companyId, role } };
}

/**
 * Server-side permission check for use inside React Server Components
 * (pages, layouts). Returns a boolean so callers can decide whether to
 * render a control or redirect.
 *
 * Do NOT use this in place of `requirePermission` inside server actions
 * or route handlers -- the gate helper returns a structured error that
 * matches the action response shape. This helper is just for rendering
 * decisions.
 */
export async function canCurrentUser(permission: Permission): Promise<boolean> {
  const session = await auth();
  const role = asRole(session?.user?.role);
  return roleCan(role, permission);
}

/**
 * Returns the current user's role on the server, or null.
 */
export async function getCurrentRole() {
  const session = await auth();
  return asRole(session?.user?.role);
}
