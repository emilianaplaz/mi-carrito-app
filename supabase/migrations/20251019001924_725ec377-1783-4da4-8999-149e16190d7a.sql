-- Remove duplicate entries from product_prices, keeping only the first one of each duplicate set
DELETE FROM product_prices
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY product_id, brand_id, supermarket_id, price, unit
             ORDER BY created_at, id
           ) AS row_num
    FROM product_prices
  ) t
  WHERE t.row_num > 1
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE product_prices
ADD CONSTRAINT product_prices_unique_entry 
UNIQUE (product_id, brand_id, supermarket_id, price, unit);