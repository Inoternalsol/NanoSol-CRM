-- Migration: Fix Contact Deletion Cascades
-- Ensures that deleting a contact also removes associated data that might block deletion.

-- 1. Fix emails -> sequence_enrollments cascade
-- (This might đã exist in 20240524000002_fix_emails_cascade.sql, but we'll ensure it's correct)
ALTER TABLE IF EXISTS public.emails 
  DROP CONSTRAINT IF EXISTS emails_enrollment_id_fkey;

ALTER TABLE IF EXISTS public.emails
  ADD CONSTRAINT emails_enrollment_id_fkey 
  FOREIGN KEY (enrollment_id) 
  REFERENCES public.sequence_enrollments(id) 
  ON DELETE CASCADE;

-- 2. Ensure sequence_enrollments -> contacts cascade
-- (Already in schema, but for safety)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='sequence_enrollments_contact_id_fkey') THEN
        ALTER TABLE public.sequence_enrollments DROP CONSTRAINT sequence_enrollments_contact_id_fkey;
        ALTER TABLE public.sequence_enrollments ADD CONSTRAINT sequence_enrollments_contact_id_fkey 
            FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Ensure deals -> contacts cascade (Currently ON DELETE SET NULL - matches initial_schema.sql)
-- We'll keep it as SET NULL to avoid losing deals when contacts are deleted, 
-- but if the user wants hard delete, they can change it. 
-- However, activities/tasks/files/notes ALREADY have ON DELETE CASCADE or REFERENCES projects(id) ON DELETE CASCADE.

-- 4. Double check activities -> contacts
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='activities_contact_id_fkey') THEN
        ALTER TABLE public.activities DROP CONSTRAINT activities_contact_id_fkey;
        ALTER TABLE public.activities ADD CONSTRAINT activities_contact_id_fkey 
            FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
    END IF;
END $$;
