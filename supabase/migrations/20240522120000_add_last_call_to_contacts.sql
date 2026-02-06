-- Add last_call columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_call_status text,
ADD COLUMN IF NOT EXISTS last_call_at timestamptz;

-- Create function to update contact status on call log insertion
CREATE OR REPLACE FUNCTION public.update_contact_last_call()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if contact_id is present
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

-- Create trigger
DROP TRIGGER IF EXISTS on_call_log_created ON call_logs;
CREATE TRIGGER on_call_log_created
    AFTER INSERT ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_contact_last_call();
