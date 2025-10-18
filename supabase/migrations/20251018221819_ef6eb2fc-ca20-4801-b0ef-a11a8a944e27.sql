-- Delete duplicate products, keeping only one entry per product name
WITH duplicates AS (
  SELECT id, name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM public.products
)
DELETE FROM public.products
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);