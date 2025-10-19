-- Delete duplicate product prices, keeping only the first occurrence
-- Duplicates are identified by matching producto, mercado, and marca

DELETE FROM product_prices
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY producto, mercado, marca 
             ORDER BY created_at ASC, id ASC
           ) AS row_num
    FROM product_prices
  ) AS ranked
  WHERE row_num > 1
);