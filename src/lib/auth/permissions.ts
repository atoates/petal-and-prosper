/**
 * Role-Based Access Control for Petal & Prosper
 *
 * Three roles: admin, manager, staff.
 *
 * Standard hierarchy:
 *   - admin   : full control, incl. user management and company settings
 *   - manager : all day-to-day ops (CRUD) incl. deletes and pricing,
 *               but not user management or company settings
 *   - staff   : read/create/update on day-to-day ops, NO deletes,
 *               NO pricing changes, NO user/company settings
 *
 * NOTE: this file is intentionally free of any import that touches the
 * server runtime (db, NextAuth, pg). It is reached by client components
 * via `permissions-client.ts`, so anything that pulls in server-only
 * modules must live in `permissions-server.ts` instead.
 */

export type Role = "admin" | "manager" | "staff";

export const ROLES = ["admin", "manager", "staff"] as const;

export type Permission =
  // Enquiries
  | "enquiries:read"
  | "enquiries:create"
  | "enquiries:update"
  | "enquiries:archive"
  | "enquiries:delete"
  // Orders
  | "orders:read"
  | "orders:create"
  | "orders:update"
  | "orders:delete"
  // Proposals
  | "proposals:read"
  | "proposals:create"
  | "proposals:update"
  | "proposals:delete"
  // Invoices
  | "invoices:read"
  | "invoices:create"
  | "invoices:update"
  | "invoices:delete"
  // Wholesale
  | "wholesale:read"
  | "wholesale:create"
  | "wholesale:update"
  | "wholesale:delete"
  // Production
  | "production:read"
  | "production:create"
  | "production:update"
  | "production:delete"
  // Delivery
  | "delivery:read"
  | "delivery:create"
  | "delivery:update"
  | "delivery:delete"
  // Products / libraries
  | "products:read"
  | "products:create"
  | "products:update"
  | "products:delete"
  // Pricing settings (pricing multiples, staff cost, fuel, etc.)
  | "pricing:read"
  | "pricing:update"
  // Proposal / invoice templates
  | "templates:read"
  | "templates:update"
  // Company profile (name, registration, currency, etc.)
  | "company:read"
  | "company:update"
  // User management
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete";

/**
 * Permission matrix.
 *
 * Convention: if a permission is listed for a role, that role has it.
 * If you need to add a permission, update this matrix rather than
 * sprinkling ad-hoc role checks through server actions.
 */
const PERMISSION_MATRIX: Record<Role, readonly Permission[]> = {
  admin: [
    // Admin gets everything. Kept explicit so the source of truth is
    // one table, rather than admin being a magical bypass.
    "enquiries:read",
    "enquiries:create",
    "enquiries:update",
    "enquiries:archive",
    "enquiries:delete",
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:delete",
    "proposals:read",
    "proposals:create",
    "proposals:update",
    "proposals:delete",
    "invoices:read",
    "invoices:create",
    "invoices:update",
    "invoices:delete",
    "wholesale:read",
    "wholesale:create",
    "wholesale:update",
    "wholesale:delete",
    "production:read",
    "production:create",
    "production:update",
    "production:delete",
    "delivery:read",
    "delivery:create",
    "delivery:update",
    "delivery:delete",
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "pricing:read",
    "pricing:update",
    "templates:read",
    "templates:update",
    "company:read",
    "company:update",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
  ],
  manager: [
    // Manager: all day-to-day ops incl. deletes and pricing.
    // Not allowed: user management, company profile edit.
    "enquiries:read",
    "enquiries:create",
    "enquiries:update",
    "enquiries:archive",
    "enquiries:delete",
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:delete",
    "proposals:read",
    "proposals:create",
    "proposals:update",
    "proposals:delete",
    "invoices:read",
    "invoices:create",
    "invoices:update",
    "invoices:delete",
    "wholesale:read",
    "wholesale:create",
    "wholesale:update",
    "wholesale:delete",
    "production:read",
    "production:create",
    "production:update",
    "production:delete",
    "delivery:read",
    "delivery:create",
    "delivery:update",
    "delivery:delete",
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "pricing:read",
    "pricing:update",
    "templates:read",
    "templates:update",
    // Managers can view company profile but not edit it.
    "company:read",
    // Managers can view team but not manage membership.
    "users:read",
  ],
  staff: [
    // Staff: read/create/update on day-to-day ops. No deletes,
    // no pricing changes, no company/user settings.
    "enquiries:read",
    "enquiries:create",
    "enquiries:update",
    "enquiries:archive",
    "orders:read",
    "orders:create",
    "orders:update",
    "proposals:read",
    "proposals:create",
    "proposals:update",
    "invoices:read",
    "invoices:create",
    "invoices:update",
    "wholesale:read",
    "wholesale:create",
    "wholesale:update",
    "production:read",
    "production:create",
    "production:update",
    "delivery:read",
    "delivery:create",
    "delivery:update",
    "products:read",
    "products:create",
    "products:update",
    "pricing:read",
    "templates:read",
    "company:read",
    "users:read",
  ],
};

/**
 * Pure predicate: does this role have this permission?
 * Safe to call on the client (takes no session).
 */
export function roleCan(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = PERMISSION_MATRIX[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Normalise an unknown value (e.g. from the session) into a Role or null.
 * Rejects anything that isn't one of the three valid roles.
 */
export function asRole(value: unknown): Role | null {
  if (value === "admin" || value === "manager" || value === "staff") {
    return value;
  }
  return null;
}

export type AuthContext = {
  userId: string;
  companyId: string;
  role: Role;
};

export type AuthError = { success: false; error: string };
