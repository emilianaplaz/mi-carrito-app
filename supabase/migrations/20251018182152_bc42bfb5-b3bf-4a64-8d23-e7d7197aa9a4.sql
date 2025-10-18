-- Create grocery_lists table
CREATE TABLE public.grocery_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for grocery_lists
CREATE POLICY "Users can view their own grocery lists" 
ON public.grocery_lists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grocery lists" 
ON public.grocery_lists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grocery lists" 
ON public.grocery_lists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grocery lists" 
ON public.grocery_lists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_grocery_lists_updated_at
BEFORE UPDATE ON public.grocery_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_pantry_items_updated_at();