-- Rename production_schedules.event_date -> production_date
-- Rename delivery_schedules.event_date   -> delivery_date
--
-- Background: both tables used a column called "event_date" that
-- was ambiguous with enquiries.event_date (the client event). The
-- column on the schedule tables is actually the date the schedule
-- is being performed on, not the event itself. Renaming to honest
-- names ("production_date", "delivery_date") clears up a recurring
-- source of confusion in the dashboard and API layers.
--
-- Idempotent: uses information_schema probes so re-running is safe
-- after the column has already been renamed on a given database.

DO $$
BEGIN
  -- production_schedules.event_date -> production_date
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'production_schedules'
      AND column_name = 'event_date'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'production_schedules'
      AND column_name = 'production_date'
  ) THEN
    ALTER TABLE production_schedules
      RENAME COLUMN event_date TO production_date;
  END IF;

  -- delivery_schedules.event_date -> delivery_date
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'delivery_schedules'
      AND column_name = 'event_date'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'delivery_schedules'
      AND column_name = 'delivery_date'
  ) THEN
    ALTER TABLE delivery_schedules
      RENAME COLUMN event_date TO delivery_date;
  END IF;
END $$;
