-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are viewable by everyone
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories 
FOR SELECT 
USING (true);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products are viewable by everyone
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (true);

-- Create index on product name for faster searches
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_products_category ON public.products(category_id);

-- Migrate existing product names to products table
INSERT INTO public.products (name)
SELECT DISTINCT product_name 
FROM public.product_prices
ON CONFLICT DO NOTHING;

-- Add product_id column to product_prices
ALTER TABLE public.product_prices 
ADD COLUMN product_id UUID REFERENCES public.products(id);

-- Update product_prices to link to products table
UPDATE public.product_prices pp
SET product_id = p.id
FROM public.products p
WHERE pp.product_name = p.name;

-- Make product_id required and drop product_name
ALTER TABLE public.product_prices 
ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.product_prices 
DROP COLUMN product_name;

-- Rename updated_at to last_updated for consistency with proposed schema
ALTER TABLE public.product_prices 
RENAME COLUMN updated_at TO last_updated;

-- Create indexes on product_prices for faster queries
CREATE INDEX idx_prices_product ON public.product_prices(product_id);
CREATE INDEX idx_prices_supermarket ON public.product_prices(supermarket_id);
CREATE INDEX idx_prices_brand ON public.product_prices(brand_id);

-- Create function to update products updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for products timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_products_updated_at();