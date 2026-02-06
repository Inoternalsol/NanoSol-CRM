-- Migration: Add Sequence Tables and RLS Policies
-- Ensures tables exist and users can only manage enrollments for sequences belonging to their organization

-- 1. Create email_sequences if missing
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]', -- Array of {id, order, delay_days, template_id, subject_override}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sequence_enrollments if missing
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'paused', 'completed', 'replied')) DEFAULT 'active',
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drop first to allow re-running script)
DROP POLICY IF EXISTS "enrollments_select" ON sequence_enrollments;
DROP POLICY IF EXISTS "enrollments_insert" ON sequence_enrollments;
DROP POLICY IF EXISTS "enrollments_update" ON sequence_enrollments;
DROP POLICY IF EXISTS "enrollments_delete" ON sequence_enrollments;

-- Allow users to view enrollments for sequences in their organization
CREATE POLICY "enrollments_select" ON sequence_enrollments FOR SELECT
  USING (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE organization_id = get_user_org_id()
    )
  );

-- Allow users to enroll contacts in sequences in their organization
CREATE POLICY "enrollments_insert" ON sequence_enrollments FOR INSERT
  WITH CHECK (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE organization_id = get_user_org_id()
    )
  );

-- Allow users to update enrollments (pause, complete, etc) for their sequences
CREATE POLICY "enrollments_update" ON sequence_enrollments FOR UPDATE
  USING (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE organization_id = get_user_org_id()
    )
  );

-- Allow users to delete enrollments for their sequences
CREATE POLICY "enrollments_delete" ON sequence_enrollments FOR DELETE
  USING (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE organization_id = get_user_org_id()
    )
  );
