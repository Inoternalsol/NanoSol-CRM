-- Consolidated Fix for Contacts Table
-- Run this in your Supabase SQL Editor to ensure the contacts table is fully compatible with the UI.

-- 1. Add missing 'status' column
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- 2. Add last_call columns (for analytics and call logging)
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS last_call_status text,
ADD COLUMN IF NOT EXISTS last_call_at timestamptz;

-- 3. Create or Refresh the update_contact_last_call function
CREATE OR REPLACE FUNCTION public.update_contact_last_call()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET 
            last_call_status = NEW.status,
            last_call_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.contact_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create or Refresh the trigger
DROP TRIGGER IF EXISTS on_call_log_created ON call_logs;
CREATE TRIGGER on_call_log_created
    AFTER INSERT ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_contact_last_call();

-- 5. Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
