-- Fix foreign key constraint on emails table to allow cascade deletion
-- This prevents the error: "update or delete on table sequence_enrollments violates foreign key constraint emails_enrollment_id_fkey"

-- Step 1: Drop the existing constraint if it exists
ALTER TABLE IF EXISTS emails 
  DROP CONSTRAINT IF EXISTS emails_enrollment_id_fkey;

-- Step 2: Recreate the constraint with ON DELETE CASCADE
-- This ensures that when a sequence_enrollment is deleted, related emails are also deleted
ALTER TABLE IF EXISTS emails
  ADD CONSTRAINT emails_enrollment_id_fkey 
  FOREIGN KEY (enrollment_id) 
  REFERENCES sequence_enrollments(id) 
  ON DELETE CASCADE;
