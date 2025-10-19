-- Add budget column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN budget numeric CHECK (budget > 0);