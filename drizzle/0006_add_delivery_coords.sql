-- Add geocoded coordinates to delivery_schedules so the delivery map
-- can render markers without re-geocoding on every page load.
ALTER TABLE "delivery_schedules" ADD COLUMN "delivery_lat" numeric(10,7);
ALTER TABLE "delivery_schedules" ADD COLUMN "delivery_lng" numeric(10,7);
