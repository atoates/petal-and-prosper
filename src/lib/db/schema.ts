import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "staff"]);
export const enquiryProgressEnum = pgEnum("enquiry_progress", [
  "New",
  "TBD",
  "Live",
  "Done",
  "Placed",
  "Order",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "quote",
  "confirmed",
  "cancelled",
  "completed",
]);
export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "essential",
  "growth",
  "enterprise",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "expired",
]);
export const addressTypeEnum = pgEnum("address_type", [
  "billing",
  "delivery",
  "studio",
]);
export const productCategoryEnum = pgEnum("product_category", [
  "flower",
  "foliage",
  "sundry",
  "container",
  "ribbon",
  "accessory",
]);
export const contactTypeEnum = pgEnum("contact_type", [
  "customer",
  "supplier",
  "both",
]);
export const wholesaleStatusEnum = pgEnum("wholesale_status", [
  "pending",
  "confirmed",
  "dispatched",
  "received",
  "cancelled",
]);
export const productionStatusEnum = pgEnum("production_status", [
  "not_started",
  "in_progress",
  "completed",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "ready",
  "dispatched",
  "delivered",
]);

// Tables
//
// Foreign key strategy (see #18 in Process-Flow-Review-2026-04-11.md):
//
// - companyId → companies.id is always ON DELETE CASCADE. Deleting a
//   tenant removes all of their rows, no orphans left behind.
// - orderId → orders.id is ON DELETE CASCADE for anything that only
//   exists in the context of an order (items, proposals, invoices,
//   production, delivery, wholesale). The app-layer delete handlers
//   can still gate this behind confirmations; the FK just guarantees
//   we never leak orphan rows if a delete succeeds.
// - createdBy / updatedBy → users.id is ON DELETE SET NULL so a user
//   leaving the company doesn't blow up their historic audit trail.
// - orders.enquiryId → enquiries.id is ON DELETE CASCADE so deleting
//   an enquiry cleans up the orders that hung off it. The existing
//   enquiry DELETE handler already did this in application code; now
//   the DB guarantees it even if that path is bypassed.
// - deliverySchedules.venueId → venues.id is ON DELETE SET NULL so a
//   deleted venue doesn't nuke historical delivery records.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: userRoleEnum("role").default("staff"),
  // Forward reference to companies is intentional -- the companies
  // table is declared a few lines below. Drizzle resolves
  // .references() callbacks lazily so this works despite the
  // textual order.
  companyId: text("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens. One row per "I forgot my password" request.
// Tokens are opaque 32-byte hex strings; we store them hashed (sha256)
// rather than in the clear so a DB read can't be replayed. expiresAt
// is set to +60 minutes on creation. usedAt is stamped the first time
// a reset succeeds so tokens are strictly single-use.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  registrationNo: varchar("registration_no", { length: 100 }),
  contactNo: varchar("contact_no", { length: 20 }),
  email: varchar("email", { length: 255 }),
  currency: varchar("currency", { length: 3 }).default("GBP"),
  logoUrl: text("logo_url"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  type: addressTypeEnum("type").notNull(),
  buildingName: varchar("building_name", { length: 255 }),
  street: varchar("street", { length: 255 }).notNull(),
  town: varchar("town", { length: 100 }),
  city: varchar("city", { length: 100 }).notNull(),
  postcode: varchar("postcode", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Contacts / Address Book ───────────────────────────────────
export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  type: contactTypeEnum("type").notNull().default("customer"),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  mobile: varchar("mobile", { length: 30 }),
  companyName: varchar("company_name", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  website: varchar("website", { length: 500 }),
  addressLine1: varchar("address_line_1", { length: 255 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  county: varchar("county", { length: 100 }),
  postcode: varchar("postcode", { length: 20 }),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  paymentTerms: varchar("payment_terms", { length: 100 }),
  vatNumber: varchar("vat_number", { length: 50 }),
  accountRef: varchar("account_ref", { length: 100 }),
  tags: text("tags"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const enquiries = pgTable(
  "enquiries",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    clientEmail: varchar("client_email", { length: 255 }).notNull(),
    clientPhone: varchar("client_phone", { length: 20 }),
    // Top-level classification
    enquiryType: varchar("enquiry_type", { length: 100 }),
    status: varchar("status", { length: 100 }),
    progress: enquiryProgressEnum("progress").default("New"),
    // Event details
    eventType: varchar("event_type", { length: 100 }),
    eventDate: timestamp("event_date"),
    enquiryDate: timestamp("enquiry_date"),
    colourScheme: varchar("colour_scheme", { length: 255 }),
    guestNumbers: integer("guest_numbers"),
    budget: decimal("budget", { precision: 10, scale: 2 }),
    // Venue A
    venueA: varchar("venue_a", { length: 255 }),
    venueATown: varchar("venue_a_town", { length: 255 }),
    venueAPhone: varchar("venue_a_phone", { length: 30 }),
    venueAContact: varchar("venue_a_contact", { length: 255 }),
    // Venue B
    venueB: varchar("venue_b", { length: 255 }),
    venueBTown: varchar("venue_b_town", { length: 255 }),
    venueBPhone: varchar("venue_b_phone", { length: 30 }),
    venueBContact: varchar("venue_b_contact", { length: 255 }),
    // Planner details
    plannerName: varchar("planner_name", { length: 255 }),
    plannerCompany: varchar("planner_company", { length: 255 }),
    plannerPhone: varchar("planner_phone", { length: 30 }),
    plannerEmail: varchar("planner_email", { length: 255 }),
    notes: text("notes"),
    // Audit columns: user id of whoever originally created the row and
    // whoever last touched it. Both nullable because historic rows
    // predate this column and we backfill lazily on the next update.
    // onDelete is set null so losing a user doesn't nuke the audit
    // trail on their historic rows.
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    archivedAt: timestamp("archived_at"),
  }
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    enquiryId: text("enquiry_id").references(() => enquiries.id, {
      onDelete: "cascade",
    }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    version: integer("version").default(1),
    status: orderStatusEnum("status").default("draft"),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
    // JSON snapshot of the PricingRules that produced the current line
    // item totals, plus any delivery/labour inputs the user supplied.
    // This lets us re-render a historical quote even if price_settings
    // has changed since. Nullable because older rows were created before
    // the pricing engine was wired in.
    pricingSnapshot: text("pricing_snapshot"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }),
    quantity: integer("quantity").notNull(),
    // baseCost is what the florist pays for one unit (ex-VAT). The
    // pricing engine reads this column when applying markup / buffer
    // rules, so we can always re-derive unitPrice from first
    // principles rather than trying to reverse-engineer a sell price.
    // Nullable for legacy rows created before auto-pricing was wired
    // in; those rows fall back to treating unitPrice as the base cost
    // in the apply-pricing route.
    baseCost: decimal("base_cost", { precision: 10, scale: 2 }),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export const proposals = pgTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    status: proposalStatusEnum("status").default("draft"),
    sentAt: timestamp("sent_at"),
    // Email subject line when this proposal is sent. Optional because
    // older draft proposals were created before the send flow existed.
    subject: text("subject"),
    // Rendered HTML body of the email (or the page the client sees
    // when they follow the public accept/decline link).
    bodyHtml: text("body_html"),
    // Opaque random token that becomes part of the public
    // accept/decline URL. We don't put the proposal id in the URL so
    // a leaked id can't be used to guess at another tenant's data.
    publicToken: text("public_token"),
    // Timestamps recorded when the client clicks accept/decline from
    // the public page.
    acceptedAt: timestamp("accepted_at"),
    rejectedAt: timestamp("rejected_at"),
    content: text("content"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
    status: invoiceStatusEnum("status").default("draft"),
    // Subtotal is the sum of order line items (pre-VAT). VAT rate is
    // a percentage (e.g. "20.00" for 20 %). vatAmount is subtotal *
    // rate / 100, persisted so historic invoices stay stable if a
    // tenant later changes their default rate. totalAmount =
    // subtotal + vatAmount and is the figure the client pays.
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
    vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("0"),
    vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default(
      "0"
    ),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    // Payment tracking. amountPaid is the running total the florist
    // has received (supports partial payments); paymentMethod is a
    // free-form tag (bank transfer, card, cash).
    amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default(
      "0"
    ),
    paymentMethod: varchar("payment_method", { length: 50 }),
    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const wholesaleOrders = pgTable(
  "wholesale_orders",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    supplier: varchar("supplier", { length: 255 }).notNull(),
    // Line items live in wholesaleOrderItems (#16). The old
    // text("items") JSON blob was dropped because it couldn't be
    // queried, reported on, or joined against the product library.
    status: wholesaleStatusEnum("status").default("pending"),
    orderDate: timestamp("order_date").defaultNow(),
    receivedDate: timestamp("received_date"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const productionSchedules = pgTable(
  "production_schedules",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    // productionDate is the date the arrangements are built -- usually
    // a day or two before the event itself. Previously called
    // eventDate but that was misleading because the event typically
    // falls after production finishes.
    productionDate: timestamp("production_date"),
    // Line items live in productionScheduleItems (#16). The old
    // text("items") JSON blob was dropped -- see wholesale for the
    // same rationale.
    // assignedTo stores the user id of the team member leading this
    // production batch. Kept nullable so legacy rows stay valid.
    assignedTo: text("assigned_to"),
    // tasks is a JSON-stringified array of { id, label, done, assignedTo? }
    // allowing a lightweight task breakdown without a whole new table.
    tasks: text("tasks"),
    notes: text("notes"),
    status: productionStatusEnum("status").default("not_started"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const deliverySchedules = pgTable(
  "delivery_schedules",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    // deliveryDate is when the arrangements leave the studio --
    // usually the day of the event. Previously called eventDate,
    // but production and delivery both had an eventDate field which
    // confused places that needed to tell them apart.
    deliveryDate: timestamp("delivery_date"),
    deliveryAddress: text("delivery_address"),
    // Optional pointer to a saved venue for quick reuse. Nullable so
    // ad-hoc addresses still work without forcing a venue record.
    // onDelete: set null means deleting a venue doesn't nuke
    // historical delivery records -- the address text is already
    // persisted separately in deliveryAddress.
    venueId: text("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    // Driver is the user id of whoever will drive the delivery run.
    driverId: text("driver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Time slot is a free-form string like "09:00 - 10:30" so tenants
    // aren't forced into a fixed slot schema. Structured enough for
    // display, flexible enough for real world operations.
    timeSlot: varchar("time_slot", { length: 50 }),
    // Line items live in deliveryScheduleItems (#16). The old
    // text("items") JSON blob was dropped -- see wholesale for the
    // same rationale.
    notes: text("notes"),
    status: deliveryStatusEnum("status").default("pending"),

    // ── Travel cost calculator fields ──
    // Setup / delivery leg
    setupVehicles: integer("setup_vehicles").default(1),
    setupDistanceMiles: decimal("setup_distance_miles", { precision: 7, scale: 2 }).default("0"),
    setupStaff: integer("setup_staff").default(0),
    setupTravelTimeMins: integer("setup_travel_time_mins").default(0),
    setupTimeOnSiteMins: integer("setup_time_on_site_mins").default(0),
    setupCostCalculated: decimal("setup_cost_calculated", { precision: 10, scale: 2 }).default("0"),
    setupCostManual: decimal("setup_cost_manual", { precision: 10, scale: 2 }),
    useManualSetupCost: boolean("use_manual_setup_cost").default(false),
    // Collection / teardown leg
    collectionVehicles: integer("collection_vehicles").default(0),
    collectionDistanceMiles: decimal("collection_distance_miles", { precision: 7, scale: 2 }).default("0"),
    collectionStaff: integer("collection_staff").default(0),
    collectionTravelTimeMins: integer("collection_travel_time_mins").default(0),
    collectionTimeOnSiteMins: integer("collection_time_on_site_mins").default(0),
    collectionCostCalculated: decimal("collection_cost_calculated", { precision: 10, scale: 2 }).default("0"),
    collectionCostManual: decimal("collection_cost_manual", { precision: 10, scale: 2 }),
    useManualCollectionCost: boolean("use_manual_collection_cost").default(false),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

/**
 * Saved venues let teams reuse frequently-used delivery locations
 * (churches, hotels, regular event spaces) without retyping the
 * address every time. Scoped per company.
 */
export const venues = pgTable("venues", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  // Geocoded coordinates for distance/route calculations
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  contactName: varchar("contact_name", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const priceSettings = pgTable(
  "price_settings",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .unique()
      .references(() => companies.id, { onDelete: "cascade" }),
    multiple: decimal("multiple", { precision: 5, scale: 2 }).default("2.5"),
    flowerBuffer: decimal("flower_buffer", { precision: 5, scale: 2 }).default(
      "1.15"
    ),
    fuelCostPerLitre: decimal("fuel_cost_per_litre", {
      precision: 5,
      scale: 2,
    }).default("1.80"),
    milesPerGallon: integer("miles_per_gallon").default(45),
    staffCostPerHour: decimal("staff_cost_per_hour", {
      precision: 5,
      scale: 2,
    }).default("15"),
    staffMargin: decimal("staff_margin", { precision: 5, scale: 2 }).default(
      "1.5"
    ),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const proposalSettings = pgTable(
  "proposal_settings",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .unique()
      .references(() => companies.id, { onDelete: "cascade" }),
    headerText: text("header_text"),
    footerText: text("footer_text"),
    termsAndConditions: text("terms_and_conditions"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const invoiceSettings = pgTable(
  "invoice_settings",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .unique()
      .references(() => companies.id, { onDelete: "cascade" }),
    paymentTerms: text("payment_terms"),
    bankDetails: text("bank_details"),
    notes: text("notes"),
    // Tenant's default VAT rate (percentage). Used by POST /api/invoices
    // when the body doesn't override vatRate. VAT-exempt tenants leave
    // this at the "0" default. vatNumber is printed on PDFs for
    // VAT-registered tenants.
    defaultVatRate: decimal("default_vat_rate", {
      precision: 5,
      scale: 2,
    }).default("0"),
    vatNumber: varchar("vat_number", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .unique()
      .references(() => companies.id, { onDelete: "cascade" }),
    plan: subscriptionPlanEnum("plan").default("essential"),
    status: subscriptionStatusEnum("status").default("active"),
    startDate: timestamp("start_date").defaultNow(),
    endDate: timestamp("end_date"),
    monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    category: productCategoryEnum("category").notNull(),
    subcategory: varchar("subcategory", { length: 100 }),
    wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }),
    retailPrice: decimal("retail_price", { precision: 10, scale: 2 }),
    unit: varchar("unit", { length: 50 }).default("stem"),
    stemCount: integer("stem_count"),
    colour: varchar("colour", { length: 100 }),
    season: varchar("season", { length: 100 }),
    supplier: varchar("supplier", { length: 255 }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

/**
 * Line items for wholesale orders (#16).
 *
 * Replaces the old `wholesaleOrders.items` JSON text blob with a
 * proper child table. This means you can actually report on things
 * like "how many red roses did I buy last month", join against the
 * product library, and enforce quantities/prices at the DB layer.
 *
 * Cascade on wholesaleOrderId means deleting a wholesale order
 * cleans up its items. productId is nullable -- historical rows
 * from before the product library existed, or ad-hoc items that
 * aren't in the library, don't need to point at a product.
 */
export const wholesaleOrderItems = pgTable("wholesale_order_items", {
  id: text("id").primaryKey(),
  wholesaleOrderId: text("wholesale_order_id")
    .notNull()
    .references(() => wholesaleOrders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  description: varchar("description", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Line items for production schedules (#16).
 *
 * Replaces the old `productionSchedules.items` JSON text blob.
 * Production items describe what physically has to be built on
 * the production day (e.g. "bridal bouquet", "aisle arrangement
 * x4"). orderItemId is an optional pointer back to the source
 * order_items row so production can auto-populate from the quote.
 */
export const productionScheduleItems = pgTable("production_schedule_items", {
  id: text("id").primaryKey(),
  productionScheduleId: text("production_schedule_id")
    .notNull()
    .references(() => productionSchedules.id, { onDelete: "cascade" }),
  orderItemId: text("order_item_id").references(() => orderItems.id, {
    onDelete: "set null",
  }),
  description: varchar("description", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Line items for delivery schedules (#16).
 *
 * Replaces the old `deliverySchedules.items` JSON text blob. Each
 * row is a thing that physically leaves the studio on the delivery
 * run, with an optional pointer back to the source order_items row
 * for quick population from the parent quote.
 */
export const deliveryScheduleItems = pgTable("delivery_schedule_items", {
  id: text("id").primaryKey(),
  deliveryScheduleId: text("delivery_schedule_id")
    .notNull()
    .references(() => deliverySchedules.id, { onDelete: "cascade" }),
  orderItemId: text("order_item_id").references(() => orderItems.id, {
    onDelete: "set null",
  }),
  description: varchar("description", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many, one }) => ({
  users: many(users),
  addresses: many(addresses),
  contacts: many(contacts),
  enquiries: many(enquiries),
  orders: many(orders),
  proposals: many(proposals),
  invoices: many(invoices),
  wholesaleOrders: many(wholesaleOrders),
  productionSchedules: many(productionSchedules),
  deliverySchedules: many(deliverySchedules),
  venues: many(venues),
  products: many(products),
  priceSettings: one(priceSettings),
  proposalSettings: one(proposalSettings),
  invoiceSettings: one(invoiceSettings),
  subscription: one(subscriptions),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  company: one(companies, {
    fields: [addresses.companyId],
    references: [companies.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  enquiries: many(enquiries),
}));

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  company: one(companies, {
    fields: [enquiries.companyId],
    references: [companies.id],
  }),
  contact: one(contacts, {
    fields: [enquiries.contactId],
    references: [contacts.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  company: one(companies, {
    fields: [orders.companyId],
    references: [companies.id],
  }),
  enquiry: one(enquiries, {
    fields: [orders.enquiryId],
    references: [enquiries.id],
  }),
  items: many(orderItems),
  proposals: many(proposals),
  invoices: many(invoices),
  wholesaleOrders: many(wholesaleOrders),
  productionSchedules: many(productionSchedules),
  deliverySchedules: many(deliverySchedules),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  company: one(companies, {
    fields: [proposals.companyId],
    references: [companies.id],
  }),
  order: one(orders, {
    fields: [proposals.orderId],
    references: [orders.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
}));

export const wholesaleOrdersRelations = relations(
  wholesaleOrders,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [wholesaleOrders.companyId],
      references: [companies.id],
    }),
    order: one(orders, {
      fields: [wholesaleOrders.orderId],
      references: [orders.id],
    }),
    items: many(wholesaleOrderItems),
  })
);

export const wholesaleOrderItemsRelations = relations(
  wholesaleOrderItems,
  ({ one }) => ({
    wholesaleOrder: one(wholesaleOrders, {
      fields: [wholesaleOrderItems.wholesaleOrderId],
      references: [wholesaleOrders.id],
    }),
    product: one(products, {
      fields: [wholesaleOrderItems.productId],
      references: [products.id],
    }),
  })
);

export const productionSchedulesRelations = relations(
  productionSchedules,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [productionSchedules.companyId],
      references: [companies.id],
    }),
    order: one(orders, {
      fields: [productionSchedules.orderId],
      references: [orders.id],
    }),
    items: many(productionScheduleItems),
  })
);

export const productionScheduleItemsRelations = relations(
  productionScheduleItems,
  ({ one }) => ({
    productionSchedule: one(productionSchedules, {
      fields: [productionScheduleItems.productionScheduleId],
      references: [productionSchedules.id],
    }),
    orderItem: one(orderItems, {
      fields: [productionScheduleItems.orderItemId],
      references: [orderItems.id],
    }),
  })
);

export const deliverySchedulesRelations = relations(
  deliverySchedules,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [deliverySchedules.companyId],
      references: [companies.id],
    }),
    order: one(orders, {
      fields: [deliverySchedules.orderId],
      references: [orders.id],
    }),
    venue: one(venues, {
      fields: [deliverySchedules.venueId],
      references: [venues.id],
    }),
    items: many(deliveryScheduleItems),
  })
);

export const deliveryScheduleItemsRelations = relations(
  deliveryScheduleItems,
  ({ one }) => ({
    deliverySchedule: one(deliverySchedules, {
      fields: [deliveryScheduleItems.deliveryScheduleId],
      references: [deliverySchedules.id],
    }),
    orderItem: one(orderItems, {
      fields: [deliveryScheduleItems.orderItemId],
      references: [orderItems.id],
    }),
  })
);

export const venuesRelations = relations(venues, ({ one, many }) => ({
  company: one(companies, {
    fields: [venues.companyId],
    references: [companies.id],
  }),
  deliverySchedules: many(deliverySchedules),
}));

export const priceSettingsRelations = relations(priceSettings, ({ one }) => ({
  company: one(companies, {
    fields: [priceSettings.companyId],
    references: [companies.id],
  }),
}));

export const proposalSettingsRelations = relations(
  proposalSettings,
  ({ one }) => ({
    company: one(companies, {
      fields: [proposalSettings.companyId],
      references: [companies.id],
    }),
  })
);

export const invoiceSettingsRelations = relations(
  invoiceSettings,
  ({ one }) => ({
    company: one(companies, {
      fields: [invoiceSettings.companyId],
      references: [companies.id],
    }),
  })
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  company: one(companies, {
    fields: [subscriptions.companyId],
    references: [companies.id],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
}));

// ---------------------------------------------------------------------------
// Product bundles -- pre-built arrangements that explode into line items
// ---------------------------------------------------------------------------

export const bundles = pgTable("bundles", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bundleItems = pgTable("bundle_items", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id")
    .notNull()
    .references(() => bundles.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  description: varchar("description", { length: 500 }).notNull(),
  category: productCategoryEnum("category"),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  company: one(companies, {
    fields: [bundles.companyId],
    references: [companies.id],
  }),
  items: many(bundleItems),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle: one(bundles, {
    fields: [bundleItems.bundleId],
    references: [bundles.id],
  }),
  product: one(products, {
    fields: [bundleItems.productId],
    references: [products.id],
  }),
}));
