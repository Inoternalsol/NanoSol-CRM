-- Enable Realtime for core tables safely
BEGIN;

-- Create publication if it doesn't exist (Supabase usually has 'realtime')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'realtime') THEN
        CREATE PUBLICATION realtime;
    END IF;
END $$;

-- Add tables to the publication only if they are NOT already members
DO $$
DECLARE
    t text;
    tables_to_add text[] := ARRAY[
        'contacts', 
        'deals', 
        'email_sequences', 
        'sequence_enrollments', 
        'contact_statuses', 
        'pipelines', 
        'tasks', 
        'activities', 
        'calendar_events', 
        'call_logs', 
        'automation_rules'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_add
    LOOP
        -- Check if the table exists AND is not already in the publication
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = t AND schemaname = 'public') AND
           NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'realtime' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION realtime ADD TABLE %I', t);
        END IF;

        -- Also ensure REPLICA IDENTITY FULL for these tables if they exist
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = t AND schemaname = 'public') THEN
            EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', t);
        END IF;
    END LOOP;
END $$;

COMMIT;
