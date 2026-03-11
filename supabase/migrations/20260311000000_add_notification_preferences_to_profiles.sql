-- Add notification_preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": true,
  "leads": true,
  "tasks": true,
  "deals": true,
  "missed_calls": false
}'::JSONB;

-- Update existing profiles to have the default values if null
UPDATE public.profiles 
SET notification_preferences = '{
  "email": true,
  "leads": true,
  "tasks": true,
  "deals": true,
  "missed_calls": false
}'::JSONB
WHERE notification_preferences IS NULL;
