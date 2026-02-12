-- Migration: Expand Email Infrastructure (Normalized)
-- Supports multiple SMTP/IMAP accounts with consistent naming

-- 1. Safely Normalise smtp_configs (now functioning as email_accounts)
DO $$
BEGIN
    -- Rename columns if they still have the old names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smtp_configs' AND column_name = 'host') THEN
        ALTER TABLE smtp_configs RENAME COLUMN host TO smtp_host;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smtp_configs' AND column_name = 'port') THEN
        ALTER TABLE smtp_configs RENAME COLUMN port TO smtp_port;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smtp_configs' AND column_name = 'username') THEN
        ALTER TABLE smtp_configs RENAME COLUMN username TO smtp_user;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smtp_configs' AND column_name = 'password_encrypted') THEN
        ALTER TABLE smtp_configs RENAME COLUMN password_encrypted TO smtp_pass_encrypted;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smtp_configs' AND column_name = 'from_email') THEN
        ALTER TABLE smtp_configs RENAME COLUMN from_email TO email_addr;
    END IF;
END $$;

-- 2. Add New Multi-account Columns
ALTER TABLE smtp_configs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Primary Account',
ADD COLUMN IF NOT EXISTS imap_host TEXT,
ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993,
ADD COLUMN IF NOT EXISTS imap_user TEXT,
ADD COLUMN IF NOT EXISTS imap_pass_encrypted TEXT,
ADD COLUMN IF NOT EXISTS is_org_wide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- 3. Remove singleton constraint
ALTER TABLE smtp_configs DROP CONSTRAINT IF EXISTS smtp_configs_organization_id_key;

-- 4. Create Emails table for synced messages
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES smtp_configs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_id TEXT, -- IMAP Message ID for deduplication
  uid INTEGER,      -- IMAP UID
  from_name TEXT,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  folder TEXT NOT NULL DEFAULT 'inbox', -- inbox, sent, trash, archive, starred
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for folder and account lookups
CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_org ON emails(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_message_id ON emails(account_id, message_id);

-- 5. Row Level Security
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Reset policies for smtp_configs (email_accounts)
DROP POLICY IF EXISTS "smtp_select" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_insert" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_update" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_delete" ON smtp_configs;
DROP POLICY IF EXISTS "email_accounts_select" ON smtp_configs;
DROP POLICY IF EXISTS "email_accounts_insert" ON smtp_configs;
DROP POLICY IF EXISTS "email_accounts_update" ON smtp_configs;

-- Select accounts you own or that are org-wide
CREATE POLICY "email_accounts_select" ON smtp_configs FOR SELECT
  USING (
    organization_id = get_user_org_id() AND (
      is_org_wide = true OR user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Insert personal account
CREATE POLICY "email_accounts_insert" ON smtp_configs FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id() AND (
      is_org_wide = false OR EXISTS (
        SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );

-- Update/Delete personal account
CREATE POLICY "email_accounts_update" ON smtp_configs FOR UPDATE
  USING (
    organization_id = get_user_org_id() AND (
      user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
    )
  );

-- Emails RLS: Based on account access
CREATE POLICY "emails_select" ON emails FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM smtp_configs 
      WHERE organization_id = get_user_org_id() AND (
        is_org_wide = true OR user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "emails_modify" ON emails FOR ALL
  USING (
    account_id IN (
      SELECT id FROM smtp_configs 
      WHERE organization_id = get_user_org_id() AND (
        is_org_wide = true OR user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );
