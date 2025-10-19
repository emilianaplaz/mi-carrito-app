-- Drop the existing unique constraint
ALTER TABLE product_prices DROP CONSTRAINT IF EXISTS product_prices_unique_entry;

-- Add brand_name column
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- Populate brand_name from brands table
UPDATE product_prices pp
SET brand_name = b.name
FROM brands b
WHERE pp.brand_id = b.id AND pp.brand_name IS NULL;

-- Make brand_name NOT NULL after populating
ALTER TABLE product_prices ALTER COLUMN brand_name SET NOT NULL;

-- Drop the brand_id foreign key and column
ALTER TABLE product_prices DROP COLUMN IF EXISTS brand_id;

-- Add new unique constraint with brand_name
ALTER TABLE product_prices
ADD CONSTRAINT product_prices_unique_entry 
UNIQUE (product_id, brand_name, supermarket_id, price, unit);