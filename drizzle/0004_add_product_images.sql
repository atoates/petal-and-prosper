-- Add image_url column to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_url" text;

-- Add image_url column to order_items table so product images
-- persist with the order even if the product is later changed.
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "image_url" text;
