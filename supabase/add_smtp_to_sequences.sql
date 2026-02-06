-- Add SMTP Config Selection to Email Sequences
-- This migration adds smtp_config_id to email_sequences table
-- and auto-assigns the first active SMTP config for existing sequences

-- Step 1: Add the column (nullable initially)
ALTER TABLE email_sequences 
ADD COLUMN IF NOT EXISTS smtp_config_id UUID REFERENCES smtp_configs(id) ON DELETE SET NULL;

-- Step 2: Auto-populate existing sequences with their org's first active SMTP config
UPDATE email_sequences es
SET smtp_config_id = (
    SELECT sc.id
    FROM smtp_configs sc
    WHERE sc.organization_id = es.organization_id
      AND sc.is_active = true
    ORDER BY sc.created_at ASC
    LIMIT 1
)
WHERE smtp_config_id IS NULL;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_sequences_smtp_config ON email_sequences(smtp_config_id);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN email_sequences.smtp_config_id IS 'The SMTP configuration to use for sending emails in this sequence';
