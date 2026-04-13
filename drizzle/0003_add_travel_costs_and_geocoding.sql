-- Migration: 0003_add_travel_costs_and_geocoding
-- Adds travel cost calculator fields to delivery_schedules and
-- lat/lng coordinates to venues for route planning.

DO $$
BEGIN
  -- ── delivery_schedules: setup/delivery leg ──
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'setup_vehicles'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN setup_vehicles integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'setup_distance_miles'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN setup_distance_miles numeric(7,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'setup_staff'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN setup_staff integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'setup_travel_time_mins'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN setup_travel_time_mins integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'setup_time_on_site_mins'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN setup_time_on_site_mins integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'setup_cost_calculated'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN setup_cost_calculated numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'setup_cost_manual'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN setup_cost_manual numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'use_manual_setup_cost'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN use_manual_setup_cost boolean DEFAULT false;
  END IF;

  -- ── delivery_schedules: collection/teardown leg ──
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'collection_vehicles'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN collection_vehicles integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'collection_distance_miles'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN collection_distance_miles numeric(7,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'collection_staff'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN collection_staff integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'collection_travel_time_mins'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN collection_travel_time_mins integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'collection_time_on_site_mins'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN collection_time_on_site_mins integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'collection_cost_calculated'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN collection_cost_calculated numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'collection_cost_manual'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN collection_cost_manual numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'use_manual_collection_cost'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN use_manual_collection_cost boolean DEFAULT false;
  END IF;

  -- ── venues: geocoded coordinates ──
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'lat'
  ) THEN
    ALTER TABLE venues ADD COLUMN lat numeric(10,7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'lng'
  ) THEN
    ALTER TABLE venues ADD COLUMN lng numeric(10,7);
  END IF;
END $$;
