// Shared order-status types used by both the orders list page and
// the order modal. Previously each component redeclared its own
// `status: string` field, which is how the dead "pending" branch in
// the list's colour map went unnoticed: nothing typechecked against
// the actual `order_status` pgEnum in schema.ts. Fixed in #17 of
// Process-Flow-Review-2026-04-11.md.
//
// Keep this in sync with `orderStatusEnum` in src/lib/db/schema.ts.
// If you change the DB enum you must also update this constant and
// fix any exhaustiveness errors the compiler points out.

export const ORDER_STATUSES = [
  "draft",
  "quote",
  "confirmed",
  "cancelled",
  "completed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
