-- Migration: Add organization_id to sequence_enrollments
-- This simplifies RLS and makes deletion more reliable

-- 1. Add the column
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Backfill organization_id from email_sequences
UPDATE sequence_enrollments
SET organization_id = (SELECT organization_id FROM email_sequences WHERE email_sequences.id = sequence_enrollments.sequence_id)
WHERE organization_id IS NULL;

-- 3. Make it NOT NULL for future rows
ALTER TABLE sequence_enrollments ALTER COLUMN organization_id SET NOT NULL;

-- 4. Update RLS Policies
DROP POLICY IF EXISTS "enrollments_select" ON sequence_enrollments;
DROP POLICY IF EXISTS "enrollments_insert" ON sequence_enrollments;
DROP POLICY IF EXISTS "enrollments_update" ON sequence_enrollments;
DROP POLICY IF EXISTS "enrollments_delete" ON sequence_enrollments;

CREATE POLICY "enrollments_select" ON sequence_enrollments FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "enrollments_insert" ON sequence_enrollments FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "enrollments_update" ON sequence_enrollments FOR UPDATE
  USING (organization_id = get_user_org_id());

CREATE POLICY "enrollments_delete" ON sequence_enrollments FOR DELETE
  USING (organization_id = get_user_org_id());

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_org ON sequence_enrollments(organization_id);
