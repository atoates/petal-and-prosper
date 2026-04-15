/**
 * Centralised status-to-colour maps for every entity in the app.
 *
 * Previously these were duplicated across enquiries, orders, proposals,
 * invoices, production, delivery, and wholesale pages. Having a single
 * source of truth means colour changes propagate everywhere at once
 * and new statuses only need adding in one place.
 *
 * The values are Badge variant names accepted by <Badge variant={...}>.
 */

export type BadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "secondary";

/* ── Enquiry progress ── */
export const enquiryProgressColours: Record<string, BadgeVariant> = {
  New: "warning",
  TBD: "secondary",
  Live: "success",
  Done: "primary",
  Placed: "primary",
  Order: "success",
};

/* ── Orders ── */
export const orderStatusColours: Record<string, BadgeVariant> = {
  draft: "secondary",
  quote: "warning",
  confirmed: "success",
  completed: "primary",
  cancelled: "danger",
};

/* ── Proposals ── */
export const proposalStatusColours: Record<string, BadgeVariant> = {
  draft: "secondary",
  sent: "warning",
  accepted: "success",
  rejected: "danger",
};

/* ── Invoices ── */
export const invoiceStatusColours: Record<string, BadgeVariant> = {
  draft: "secondary",
  sent: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "danger",
};

/* ── Production ── */
export const productionStatusColours: Record<string, BadgeVariant> = {
  not_started: "secondary",
  in_progress: "primary",
  completed: "success",
};

/* ── Delivery ── */
export const deliveryStatusColours: Record<string, BadgeVariant> = {
  pending: "warning",
  ready: "primary",
  dispatched: "primary",
  delivered: "success",
};

/* ── Wholesale ── */
export const wholesaleStatusColours: Record<string, BadgeVariant> = {
  pending: "warning",
  confirmed: "primary",
  dispatched: "primary",
  received: "success",
  cancelled: "danger",
};

/**
 * Generic helper that formats a snake_case or lowercase status into
 * a human-friendly label: "not_started" -> "Not Started".
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
