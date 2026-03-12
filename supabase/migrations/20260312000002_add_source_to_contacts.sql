-- Migration: Add 'source' column to contacts table
-- This resolves the "Could not find column 'source' in schema cache" error

-- 1. Add the column with a default value
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual';

-- 2. Create an index for better performance when filtering by source
CREATE INDEX IF NOT EXISTS idx_contacts_source ON public.contacts(source);

-- 3. Update existing records if necessary (they will inherit the default 'Manual')
-- No specific update needed since we set a default.
