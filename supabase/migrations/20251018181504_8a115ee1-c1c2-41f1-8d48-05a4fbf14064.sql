-- Add new fields to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN plan_duration text CHECK (plan_duration IN ('1_week', '2_weeks')) DEFAULT '1_week',
ADD COLUMN breakfast_options integer DEFAULT 3,
ADD COLUMN lunch_options integer DEFAULT 3,
ADD COLUMN dinner_options integer DEFAULT 3;

-- Create meal_plans table
CREATE TABLE public.meal_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for meal_plans
CREATE POLICY "Users can view their own meal plans" 
ON public.meal_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans" 
ON public.meal_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" 
ON public.meal_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" 
ON public.meal_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_meal_plans_updated_at
BEFORE UPDATE ON public.meal_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_pantry_items_updated_at();