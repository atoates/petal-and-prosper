-- Normalise the `items` JSON text columns on wholesale_orders,
-- production_schedules, and delivery_schedules into proper child
-- tables (#16 in Process-Flow-Review-2026-04-11.md).
--
-- Before: each of those tables had `items text` storing a JSON-
-- encoded array. You couldn't query, report, or join against the
-- product library, so "how many red roses did I buy last month"
-- was unanswerable without custom SQL and a lot of regex.
--
-- After: three new child tables -- wholesale_order_items,
-- production_schedule_items, delivery_schedule_items -- each with
-- a cascading FK to the parent schedule and an optional pointer
-- back to the source order_items row (or, for wholesale, the
-- product library).
--
-- Migration strategy:
--   1. Create the three child tables.
--   2. Best-effort backfill from the legacy text("items") JSON
--      column so historic rows don't lose their line items.
--      Parses each JSON string, pulls description / category /
--      quantity / unitPrice / notes, and inserts child rows.
--      Malformed or empty JSON is silently skipped.
--   3. Drop the legacy `items` columns from the three parent
--      tables.
--
-- The DO $$ blocks use `IF NOT EXISTS` / `IF EXISTS` so re-running
-- this migration on an already-migrated DB is a no-op.

-- 1. wholesale_order_items
CREATE TABLE IF NOT EXISTS "wholesale_order_items" (
  "id" text PRIMARY KEY NOT NULL,
  "wholesale_order_id" text NOT NULL,
  "product_id" text,
  "description" varchar(500) NOT NULL,
  "category" varchar(100),
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price" numeric(10, 2),
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "wholesale_order_items"
    ADD CONSTRAINT "wholesale_order_items_wholesale_order_id_wholesale_orders_id_fk"
    FOREIGN KEY ("wholesale_order_id") REFERENCES "wholesale_orders"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "wholesale_order_items"
    ADD CONSTRAINT "wholesale_order_items_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. production_schedule_items
CREATE TABLE IF NOT EXISTS "production_schedule_items" (
  "id" text PRIMARY KEY NOT NULL,
  "production_schedule_id" text NOT NULL,
  "order_item_id" text,
  "description" varchar(500) NOT NULL,
  "category" varchar(100),
  "quantity" integer NOT NULL DEFAULT 1,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "production_schedule_items"
    ADD CONSTRAINT "production_schedule_items_production_schedule_id_production_schedules_id_fk"
    FOREIGN KEY ("production_schedule_id") REFERENCES "production_schedules"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "production_schedule_items"
    ADD CONSTRAINT "production_schedule_items_order_item_id_order_items_id_fk"
    FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. delivery_schedule_items
CREATE TABLE IF NOT EXISTS "delivery_schedule_items" (
  "id" text PRIMARY KEY NOT NULL,
  "delivery_schedule_id" text NOT NULL,
  "order_item_id" text,
  "description" varchar(500) NOT NULL,
  "category" varchar(100),
  "quantity" integer NOT NULL DEFAULT 1,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "delivery_schedule_items"
    ADD CONSTRAINT "delivery_schedule_items_delivery_schedule_id_delivery_schedules_id_fk"
    FOREIGN KEY ("delivery_schedule_id") REFERENCES "delivery_schedules"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "delivery_schedule_items"
    ADD CONSTRAINT "delivery_schedule_items_order_item_id_order_items_id_fk"
    FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Backfill from the legacy JSON columns. Only runs if the old
-- column still exists, so a second run after the DROP COLUMN step
-- below is a silent no-op.

DO $$
DECLARE
  r RECORD;
  item JSONB;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wholesale_orders' AND column_name = 'items'
  ) THEN
    FOR r IN SELECT id, items FROM wholesale_orders WHERE items IS NOT NULL AND items <> '' LOOP
      BEGIN
        FOR item IN SELECT * FROM jsonb_array_elements(r.items::jsonb) LOOP
          INSERT INTO wholesale_order_items (
            id, wholesale_order_id, description, category, quantity, unit_price, notes
          )
          VALUES (
            gen_random_uuid()::text,
            r.id,
            COALESCE(item->>'description', '(untitled)'),
            item->>'category',
            COALESCE((item->>'quantity')::int, 1),
            NULLIF(item->>'unitPrice', '')::numeric,
            item->>'notes'
          );
        END LOOP;
      EXCEPTION WHEN others THEN
        -- Row had malformed JSON. Skip rather than abort the whole
        -- migration; operators can fix stragglers by hand.
        RAISE NOTICE 'Skipping wholesale_orders.% : bad items JSON', r.id;
      END;
    END LOOP;
  END IF;
END $$;

DO $$
DECLARE
  r RECORD;
  item JSONB;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_schedules' AND column_name = 'items'
  ) THEN
    FOR r IN SELECT id, items FROM production_schedules WHERE items IS NOT NULL AND items <> '' LOOP
      BEGIN
        FOR item IN SELECT * FROM jsonb_array_elements(r.items::jsonb) LOOP
          INSERT INTO production_schedule_items (
            id, production_schedule_id, description, category, quantity, notes
          )
          VALUES (
            gen_random_uuid()::text,
            r.id,
            COALESCE(item->>'description', '(untitled)'),
            item->>'category',
            COALESCE((item->>'quantity')::int, 1),
            item->>'notes'
          );
        END LOOP;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Skipping production_schedules.% : bad items JSON', r.id;
      END;
    END LOOP;
  END IF;
END $$;

DO $$
DECLARE
  r RECORD;
  item JSONB;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'items'
  ) THEN
    FOR r IN SELECT id, items FROM delivery_schedules WHERE items IS NOT NULL AND items <> '' LOOP
      BEGIN
        FOR item IN SELECT * FROM jsonb_array_elements(r.items::jsonb) LOOP
          INSERT INTO delivery_schedule_items (
            id, delivery_schedule_id, description, category, quantity, notes
          )
          VALUES (
            gen_random_uuid()::text,
            r.id,
            COALESCE(item->>'description', '(untitled)'),
            item->>'category',
            COALESCE((item->>'quantity')::int, 1),
            item->>'notes'
          );
        END LOOP;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Skipping delivery_schedules.% : bad items JSON', r.id;
      END;
    END LOOP;
  END IF;
END $$;

-- 5. Drop the legacy columns now that the backfill is done.
ALTER TABLE "wholesale_orders" DROP COLUMN IF EXISTS "items";
ALTER TABLE "production_schedules" DROP COLUMN IF EXISTS "items";
ALTER TABLE "delivery_schedules" DROP COLUMN IF EXISTS "items";
