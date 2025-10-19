-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Subcategories are viewable by everyone" 
ON public.subcategories 
FOR SELECT 
USING (true);

-- Populate with unique subcategorias from product_prices
INSERT INTO public.subcategories (name)
SELECT DISTINCT subcategoria 
FROM public.product_prices 
WHERE subcategoria IS NOT NULL
ORDER BY subcategoria;