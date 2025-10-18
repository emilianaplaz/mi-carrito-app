-- Create supermarkets table
CREATE TABLE public.supermarkets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create brands table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create product_prices table
CREATE TABLE public.product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  supermarket_id UUID REFERENCES public.supermarkets(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.supermarkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Create policies (public read access)
CREATE POLICY "Supermarkets are viewable by everyone"
ON public.supermarkets FOR SELECT
USING (true);

CREATE POLICY "Brands are viewable by everyone"
ON public.brands FOR SELECT
USING (true);

CREATE POLICY "Product prices are viewable by everyone"
ON public.product_prices FOR SELECT
USING (true);

-- Insert dummy data for supermarkets
INSERT INTO public.supermarkets (name, logo_url) VALUES
  ('Mercadona', 'https://www.mercadona.es/images/logo.svg'),
  ('Carrefour', 'https://www.carrefour.es/images/logo.svg'),
  ('Lidl', 'https://www.lidl.es/images/logo.svg'),
  ('Alcampo', 'https://www.alcampo.es/images/logo.svg'),
  ('Dia', 'https://www.dia.es/images/logo.svg');

-- Insert dummy data for brands
INSERT INTO public.brands (name) VALUES
  ('Hacendado'),
  ('Carrefour'),
  ('Lidl'),
  ('Auchan'),
  ('Dia'),
  ('Nestlé'),
  ('Danone'),
  ('Gallo'),
  ('Carbonell'),
  ('Puleva');

-- Insert dummy product prices (example for common grocery items)
INSERT INTO public.product_prices (product_name, brand_id, supermarket_id, price, unit)
SELECT 
  'Leche entera',
  b.id,
  s.id,
  CASE 
    WHEN s.name = 'Mercadona' THEN 0.85
    WHEN s.name = 'Carrefour' THEN 0.92
    WHEN s.name = 'Lidl' THEN 0.79
    WHEN s.name = 'Alcampo' THEN 0.88
    ELSE 0.90
  END,
  'litro'
FROM public.brands b, public.supermarkets s
WHERE b.name IN ('Hacendado', 'Puleva', 'Carrefour', 'Lidl')
LIMIT 20;

INSERT INTO public.product_prices (product_name, brand_id, supermarket_id, price, unit)
SELECT 
  'Arroz largo',
  b.id,
  s.id,
  CASE 
    WHEN s.name = 'Mercadona' THEN 1.15
    WHEN s.name = 'Carrefour' THEN 1.25
    WHEN s.name = 'Lidl' THEN 1.09
    WHEN s.name = 'Alcampo' THEN 1.20
    ELSE 1.18
  END,
  'kg'
FROM public.brands b, public.supermarkets s
WHERE b.name IN ('Hacendado', 'Gallo', 'Carrefour', 'Lidl')
LIMIT 20;

INSERT INTO public.product_prices (product_name, brand_id, supermarket_id, price, unit)
SELECT 
  'Aceite de oliva',
  b.id,
  s.id,
  CASE 
    WHEN s.name = 'Mercadona' THEN 4.50
    WHEN s.name = 'Carrefour' THEN 4.75
    WHEN s.name = 'Lidl' THEN 4.20
    WHEN s.name = 'Alcampo' THEN 4.60
    ELSE 4.65
  END,
  'litro'
FROM public.brands b, public.supermarkets s
WHERE b.name IN ('Hacendado', 'Carbonell', 'Carrefour', 'Lidl')
LIMIT 20;