-- ============================================
-- Schema Alignment Migration
-- Adds missing columns that TypeScript code expects
-- ============================================

-- 1. Add phone column to profiles (referenced by Profile type & settings page)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Add completed_at to tasks (used by useCompleteTask hook)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Add updated_at to email_sequences (expected by EmailSequence type)
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger for email_sequences.updated_at
DROP TRIGGER IF EXISTS set_updated_at_email_sequences ON email_sequences;
CREATE TRIGGER set_updated_at_email_sequences
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Incorporate add_org_id_to_enrollments (may already be applied)
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill organization_id from email_sequences (safe even if already done)
UPDATE sequence_enrollments
SET organization_id = (
    SELECT organization_id FROM email_sequences
    WHERE email_sequences.id = sequence_enrollments.sequence_id
)
WHERE organization_id IS NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_org ON sequence_enrollments(organization_id);
