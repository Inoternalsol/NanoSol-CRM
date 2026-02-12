-- Enable Realtime for contact_statuses and other essential tables
DO $$
BEGIN
    -- Enable for contact_statuses
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'contact_statuses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_statuses;
    END IF;

    -- Enable for email_sequences
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'email_sequences'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.email_sequences;
    END IF;

    -- Enable for email_templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'email_templates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.email_templates;
    END IF;

    -- Enable for smtp_configs
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'smtp_configs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.smtp_configs;
    END IF;
END $$;
