-- Migration: Add smtp_config_id to email_sequences
-- Aligns database with TypeScript definition and Frontend expectations

ALTER TABLE email_sequences 
ADD COLUMN IF NOT EXISTS smtp_config_id UUID REFERENCES smtp_configs(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_email_sequences_smtp ON email_sequences(smtp_config_id);
