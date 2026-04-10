import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Shared Zod schemas for API route bodies. We keep these separate from
 * the older form-facing schemas in `./enquiry`, `./order`, `./auth`,
 * `./user` because:
 *
 *   1. Form schemas tend to have UI-only fields (e.g. confirmPassword)
 *      that must never appear on the wire.
 *   2. API schemas need to match the actual DB column shape more
 *      closely (nullable fields, numeric coercion, enum narrowing).
 *
 * Every mutating route should `safeParse` the body against one of
 * these schemas before touching the database. Never spread the raw
 * body into an insert.
 */

/* ----------------------------- helpers ---------------------------------- */

// Accept either a string or a number from the wire; coerce to a
// string-formatted decimal because Drizzle stores numeric columns as
// strings. Empty strings and undefined become null.
const decimalField = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" && v.trim() === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n.toString();
  });

// Required decimal variant -- rejects null/empty.
const requiredDecimal = z
  .union([z.string(), z.number()])
  .refine(
    (v) => {
      if (typeof v === "string" && v.trim() === "") return false;
      const n = Number(v);
      return Number.isFinite(n);
    },
    { message: "Must be a number" }
  )
  .transform((v) => Number(v).toString());

const isoDateNullable = z
  .union([z.string(), z.date()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v;
    const trimmed = v.trim();
    if (trimmed === "") return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const optionalTrimmed = (max = 500) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const t = v.trim();
      return t === "" ? null : t;
    });

const requiredTrimmed = (field: string, max = 500) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`)
    .max(max);

/* ------------------------------ enquiries -------------------------------- */

export const enquiryProgress = z.enum([
  "New",
  "TBD",
  "Live",
  "Done",
  "Placed",
  "Order",
]);

export const enquiryBodySchema = z.object({
  clientName: requiredTrimmed("Client name", 200),
  clientEmail: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255),
  clientPhone: optionalTrimmed(50),
  eventType: optionalTrimmed(100),
  eventDate: isoDateNullable,
  venueA: optionalTrimmed(200),
  venueB: optionalTrimmed(200),
  progress: enquiryProgress.default("New"),
  notes: optionalTrimmed(5000),
});
export type EnquiryBody = z.infer<typeof enquiryBodySchema>;

/* -------------------------------- orders -------------------------------- */

export const orderStatus = z.enum([
  "draft",
  "quote",
  "confirmed",
  "cancelled",
  "completed",
]);

export const orderCreateSchema = z.object({
  enquiryId: optionalTrimmed(100),
  status: orderStatus.default("draft"),
  totalPrice: decimalField,
});

export const orderItemBodySchema = z.object({
  id: z.string().optional(),
  description: requiredTrimmed("Description", 500),
  category: optionalTrimmed(100),
  quantity: z.coerce.number().int("Quantity must be whole").positive(
    "Quantity must be positive"
  ),
  unitPrice: requiredDecimal,
  totalPrice: requiredDecimal,
});

export const orderUpdateSchema = z.object({
  enquiryId: optionalTrimmed(100),
  status: orderStatus.default("draft"),
  version: z.coerce.number().int().positive().optional(),
  totalPrice: decimalField,
  items: z.array(orderItemBodySchema).optional(),
});

export const orderItemCreateSchema = orderItemBodySchema.omit({ id: true });

/* ------------------------------- invoices ------------------------------- */

export const invoiceStatus = z.enum(["draft", "sent", "paid", "overdue"]);

export const invoiceBodySchema = z.object({
  orderId: requiredTrimmed("Order ID", 100),
  invoiceNumber: requiredTrimmed("Invoice number", 100),
  status: invoiceStatus.default("draft"),
  totalAmount: requiredDecimal,
  dueDate: isoDateNullable,
  paidAt: isoDateNullable,
});

/* ------------------------------ proposals ------------------------------- */

export const proposalStatus = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
]);

export const proposalBodySchema = z.object({
  orderId: requiredTrimmed("Order ID", 100),
  status: proposalStatus.default("draft"),
  sentAt: isoDateNullable,
  // Content is free-form proposal body. Cap to avoid runaway payloads.
  content: z.string().max(50_000).nullable().optional(),
});

/* ------------------------------- products ------------------------------- */

export const productCategory = z.enum([
  "flower",
  "foliage",
  "sundry",
  "container",
  "ribbon",
  "accessory",
]);

export const productBodySchema = z.object({
  name: requiredTrimmed("Name", 200),
  category: productCategory,
  subcategory: optionalTrimmed(100),
  wholesalePrice: decimalField,
  retailPrice: decimalField,
  unit: optionalTrimmed(50),
  stemCount: z.coerce.number().int().nullable().optional(),
  colour: optionalTrimmed(100),
  season: optionalTrimmed(100),
  supplier: optionalTrimmed(200),
  notes: optionalTrimmed(2000),
  isActive: z.boolean().optional(),
});

/* ------------------------------- delivery ------------------------------- */

export const deliveryStatus = z.enum([
  "pending",
  "ready",
  "dispatched",
  "delivered",
]);

export const deliveryBodySchema = z.object({
  orderId: requiredTrimmed("Order ID", 100),
  eventDate: isoDateNullable,
  deliveryAddress: optionalTrimmed(500),
  // Items is a free-form list stringified into the items JSON column.
  items: z.unknown().optional(),
  notes: optionalTrimmed(2000),
  status: deliveryStatus.default("pending"),
});

/* ------------------------------ production ------------------------------ */

export const productionStatus = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const productionBodySchema = z.object({
  orderId: requiredTrimmed("Order ID", 100),
  eventDate: isoDateNullable,
  items: z.unknown().optional(),
  notes: optionalTrimmed(2000),
  status: productionStatus.default("not_started"),
});

/* ------------------------------- wholesale ------------------------------ */

export const wholesaleStatus = z.enum([
  "pending",
  "confirmed",
  "dispatched",
  "received",
  "cancelled",
]);

export const wholesaleBodySchema = z.object({
  orderId: requiredTrimmed("Order ID", 100),
  supplier: requiredTrimmed("Supplier", 200),
  items: z.unknown().optional(),
  status: wholesaleStatus.default("pending"),
  orderDate: isoDateNullable,
  receivedDate: isoDateNullable,
});

/* ------------------------------- settings ------------------------------- */

// Company profile settings (admin-only upstream).
export const companyUpdateSchema = z.object({
  name: optionalTrimmed(200),
  registrationNo: optionalTrimmed(100),
  contactNo: optionalTrimmed(50),
  email: z
    .string()
    .email()
    .nullable()
    .optional(),
  currency: optionalTrimmed(10),
  logoUrl: optionalTrimmed(1000),
  website: optionalTrimmed(500),
});

export const priceSettingsUpdateSchema = z.object({
  multiple: decimalField,
  flowerBuffer: decimalField,
  fuelCostPerLitre: decimalField,
  milesPerGallon: z.coerce.number().int().nullable().optional(),
  staffCostPerHour: decimalField,
  staffMargin: decimalField,
});

export const proposalSettingsUpdateSchema = z.object({
  headerText: optionalTrimmed(5000),
  footerText: optionalTrimmed(5000),
  termsAndConditions: optionalTrimmed(10_000),
});

export const invoiceSettingsUpdateSchema = z.object({
  paymentTerms: optionalTrimmed(5000),
  bankDetails: optionalTrimmed(5000),
  notes: optionalTrimmed(5000),
});

export const settingsBulkUpdateSchema = z.object({
  company: companyUpdateSchema.optional(),
  priceSettings: priceSettingsUpdateSchema.optional(),
  proposalSettings: proposalSettingsUpdateSchema.optional(),
  invoiceSettings: invoiceSettingsUpdateSchema.optional(),
});

/* --------------------- small parsing helper ----------------------------- */

export type ParsedBody<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Read the request JSON body and run it through a Zod schema. Returns
 * a discriminated result:
 *
 *   const parsed = await parseJsonBody(request, mySchema);
 *   if (!parsed.success) return parsed.response;
 *   const data = parsed.data;
 *
 * On malformed JSON or schema failure we return a consistent 400 with
 * the field errors attached, which the front end can surface directly.
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<ParsedBody<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Invalid request body",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: parsed.data };
}
