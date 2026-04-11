import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
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
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: userRoleEnum("role").default("staff"),
  companyId: text("company_id"),
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
  userId: text("user_id").notNull(),
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
  companyId: text("company_id").notNull(),
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

export const enquiries = pgTable(
  "enquiries",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    clientEmail: varchar("client_email", { length: 255 }).notNull(),
    clientPhone: varchar("client_phone", { length: 20 }),
    eventType: varchar("event_type", { length: 100 }),
    eventDate: timestamp("event_date"),
    venueA: varchar("venue_a", { length: 255 }),
    venueB: varchar("venue_b", { length: 255 }),
    progress: enquiryProgressEnum("progress").default("New"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    archivedAt: timestamp("archived_at"),
  }
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    enquiryId: text("enquiry_id"),
    companyId: text("company_id").notNull(),
    version: integer("version").default(1),
    status: orderStatusEnum("status").default("draft"),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
    // JSON snapshot of the PricingRules that produced the current line
    // item totals, plus any delivery/labour inputs the user supplied.
    // This lets us re-render a historical quote even if price_settings
    // has changed since. Nullable because older rows were created before
    // the pricing engine was wired in.
    pricingSnapshot: text("pricing_snapshot"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export const proposals = pgTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    companyId: text("company_id").notNull(),
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
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    companyId: text("company_id").notNull(),
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
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const wholesaleOrders = pgTable(
  "wholesale_orders",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    companyId: text("company_id").notNull(),
    supplier: varchar("supplier", { length: 255 }).notNull(),
    items: text("items"),
    status: wholesaleStatusEnum("status").default("pending"),
    orderDate: timestamp("order_date").defaultNow(),
    receivedDate: timestamp("received_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const productionSchedules = pgTable(
  "production_schedules",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    companyId: text("company_id").notNull(),
    eventDate: timestamp("event_date"),
    items: text("items"),
    // assignedTo stores the user id of the team member leading this
    // production batch. Kept nullable so legacy rows stay valid.
    assignedTo: text("assigned_to"),
    // tasks is a JSON-stringified array of { id, label, done, assignedTo? }
    // allowing a lightweight task breakdown without a whole new table.
    tasks: text("tasks"),
    notes: text("notes"),
    status: productionStatusEnum("status").default("not_started"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const deliverySchedules = pgTable(
  "delivery_schedules",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    companyId: text("company_id").notNull(),
    eventDate: timestamp("event_date"),
    deliveryAddress: text("delivery_address"),
    // Optional pointer to a saved venue for quick reuse. Nullable so
    // ad-hoc addresses still work without forcing a venue record.
    venueId: text("venue_id"),
    // Driver is the user id of whoever will drive the delivery run.
    driverId: text("driver_id"),
    // Time slot is a free-form string like "09:00 - 10:30" so tenants
    // aren't forced into a fixed slot schema. Structured enough for
    // display, flexible enough for real world operations.
    timeSlot: varchar("time_slot", { length: 50 }),
    items: text("items"),
    notes: text("notes"),
    status: deliveryStatusEnum("status").default("pending"),
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
  companyId: text("company_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  contactName: varchar("contact_name", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const priceSettings = pgTable(
  "price_settings",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().unique(),
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
    companyId: text("company_id").notNull().unique(),
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
    companyId: text("company_id").notNull().unique(),
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
    companyId: text("company_id").notNull().unique(),
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
    companyId: text("company_id").notNull(),
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
    isActive: varchar("is_active", { length: 5 }).default("true"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

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

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  company: one(companies, {
    fields: [enquiries.companyId],
    references: [companies.id],
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
  ({ one }) => ({
    company: one(companies, {
      fields: [wholesaleOrders.companyId],
      references: [companies.id],
    }),
    order: one(orders, {
      fields: [wholesaleOrders.orderId],
      references: [orders.id],
    }),
  })
);

export const productionSchedulesRelations = relations(
  productionSchedules,
  ({ one }) => ({
    company: one(companies, {
      fields: [productionSchedules.companyId],
      references: [companies.id],
    }),
    order: one(orders, {
      fields: [productionSchedules.orderId],
      references: [orders.id],
    }),
  })
);

export const deliverySchedulesRelations = relations(
  deliverySchedules,
  ({ one }) => ({
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
