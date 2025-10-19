-- Create cart_items table for user-specific carts
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  brand text,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL,
  unit text NOT NULL,
  supermarket text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies for cart_items
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
ON public.cart_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
ON public.cart_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
ON public.cart_items
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for cart_items updated_at
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  last_four text,
  card_brand text,
  expiry_month integer,
  expiry_year integer,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_methods
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods"
ON public.payment_methods
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for payment_methods updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();