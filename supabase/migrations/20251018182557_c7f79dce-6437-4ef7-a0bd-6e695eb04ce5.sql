-- Create recipes table
CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  prep_time integer,
  cook_time integer,
  servings integer DEFAULT 4,
  cuisine_type text,
  dietary_tags text[] DEFAULT '{}',
  meal_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_recipe_preferences table
CREATE TABLE public.user_recipe_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  is_liked boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipe_preferences ENABLE ROW LEVEL SECURITY;

-- Recipes are viewable by everyone
CREATE POLICY "Recipes are viewable by everyone" 
ON public.recipes 
FOR SELECT 
USING (true);

-- Only authenticated users can insert recipes (for AI generation)
CREATE POLICY "Authenticated users can insert recipes" 
ON public.recipes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- User recipe preferences policies
CREATE POLICY "Users can view their own recipe preferences" 
ON public.user_recipe_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipe preferences" 
ON public.user_recipe_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipe preferences" 
ON public.user_recipe_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipe preferences" 
ON public.user_recipe_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update meal_plans to store recipe_ids instead of just names
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS recipe_ids jsonb DEFAULT '{}'::jsonb;