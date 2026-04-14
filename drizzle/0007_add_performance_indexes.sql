-- Performance indexes for common query patterns.
-- Every list page filters by company_id and typically sorts by a date
-- or status column. These composite indexes cover those patterns so
-- PostgreSQL can use an index scan instead of a sequential scan as
-- data volume grows.

-- Enquiries: list filtered by company, sorted by created_at or event_date
CREATE INDEX IF NOT EXISTS idx_enquiries_company_created ON enquiries (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_company_event_date ON enquiries (company_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_company_progress ON enquiries (company_id, progress);

-- Orders: list filtered by company, sorted by created_at; detail lookups by enquiry_id
CREATE INDEX IF NOT EXISTS idx_orders_company_created ON orders (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON orders (company_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_enquiry ON orders (enquiry_id);

-- Order items: always queried by parent order
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- Proposals: list by company, lookups by order
CREATE INDEX IF NOT EXISTS idx_proposals_company_created ON proposals (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_order ON proposals (order_id);

-- Invoices: list by company, filtered by status/due date
CREATE INDEX IF NOT EXISTS idx_invoices_company_created ON invoices (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices (company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_due ON invoices (company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices (order_id);

-- Delivery schedules: list by company, sorted by delivery date
CREATE INDEX IF NOT EXISTS idx_delivery_company_date ON delivery_schedules (company_id, delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_company_status ON delivery_schedules (company_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_order ON delivery_schedules (order_id);

-- Delivery schedule items: always queried by parent
CREATE INDEX IF NOT EXISTS idx_delivery_items_schedule ON delivery_schedule_items (delivery_schedule_id);

-- Production schedules: list by company, sorted by production date
CREATE INDEX IF NOT EXISTS idx_production_company_date ON production_schedules (company_id, production_date DESC);
CREATE INDEX IF NOT EXISTS idx_production_company_status ON production_schedules (company_id, status);
CREATE INDEX IF NOT EXISTS idx_production_order ON production_schedules (order_id);

-- Production schedule items: always queried by parent
CREATE INDEX IF NOT EXISTS idx_production_items_schedule ON production_schedule_items (production_schedule_id);

-- Wholesale orders: list by company, lookups by order
CREATE INDEX IF NOT EXISTS idx_wholesale_company_created ON wholesale_orders (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wholesale_order ON wholesale_orders (order_id);

-- Wholesale order items: always queried by parent
CREATE INDEX IF NOT EXISTS idx_wholesale_items_order ON wholesale_order_items (wholesale_order_id);

-- Products: list by company, filtered by category
CREATE INDEX IF NOT EXISTS idx_products_company_created ON products (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_company_category ON products (company_id, category);

-- Bundles: list by company
CREATE INDEX IF NOT EXISTS idx_bundles_company ON bundles (company_id);

-- Bundle items: always queried by parent
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items (bundle_id);

-- Contacts: list by company
CREATE INDEX IF NOT EXISTS idx_contacts_company_created ON contacts (company_id, created_at DESC);

-- Venues: list by company
CREATE INDEX IF NOT EXISTS idx_venues_company ON venues (company_id);

-- Users: lookup by company
CREATE INDEX IF NOT EXISTS idx_users_company ON users (company_id);

-- Settings tables: single-row lookup by company
CREATE INDEX IF NOT EXISTS idx_price_settings_company ON price_settings (company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_settings_company ON proposal_settings (company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_settings_company ON invoice_settings (company_id);

-- Addresses: lookup by company
CREATE INDEX IF NOT EXISTS idx_addresses_company ON addresses (company_id);
