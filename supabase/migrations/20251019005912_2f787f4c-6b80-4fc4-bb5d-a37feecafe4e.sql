-- Drop existing product_prices table and recreate with new structure
DROP TABLE IF EXISTS product_prices CASCADE;

-- Create new product_prices table matching the Excel structure
CREATE TABLE product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategoria TEXT NOT NULL,
  producto TEXT NOT NULL,
  marca TEXT NOT NULL,
  presentacion TEXT NOT NULL,
  mercado TEXT NOT NULL,
  precio NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Product prices are viewable by everyone"
  ON product_prices
  FOR SELECT
  USING (true);

-- Create index for common queries
CREATE INDEX idx_product_prices_producto ON product_prices(producto);
CREATE INDEX idx_product_prices_marca ON product_prices(marca);
CREATE INDEX idx_product_prices_mercado ON product_prices(mercado);
CREATE INDEX idx_product_prices_subcategoria ON product_prices(subcategoria);