-- Add missing 'status' column to contacts table
-- The application expects contacts.status but the initial schema never defined it
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- Create an index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
