-- Drop the existing unique constraint
ALTER TABLE product_prices DROP CONSTRAINT IF EXISTS product_prices_unique_entry;

-- Add product_name column
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Populate product_name from products table
UPDATE product_prices pp
SET product_name = p.name
FROM products p
WHERE pp.product_id = p.id AND pp.product_name IS NULL;

-- Make product_name NOT NULL after populating
ALTER TABLE product_prices ALTER COLUMN product_name SET NOT NULL;

-- Drop the product_id foreign key and column
ALTER TABLE product_prices DROP COLUMN IF EXISTS product_id;

-- Add new unique constraint with product_name
ALTER TABLE product_prices
ADD CONSTRAINT product_prices_unique_entry 
UNIQUE (product_name, brand_name, supermarket_id, price, unit);