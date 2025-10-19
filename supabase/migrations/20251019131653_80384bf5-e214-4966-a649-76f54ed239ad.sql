-- Add automation fields to grocery_lists table
ALTER TABLE public.grocery_lists
ADD COLUMN is_automated boolean DEFAULT false,
ADD COLUMN automation_frequency text CHECK (automation_frequency IN ('weekly', 'bi-weekly', 'monthly')),
ADD COLUMN next_scheduled_date timestamp with time zone,
ADD COLUMN last_executed_date timestamp with time zone;

-- Add index for efficient querying of automated lists
CREATE INDEX idx_grocery_lists_automated ON public.grocery_lists(is_automated, next_scheduled_date) WHERE is_automated = true;