-- Migration: Add SIP Profiles and SMTP Configs tables
-- Run this in your Supabase SQL Editor

-- ============================================
-- SIP PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS sip_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  sip_username TEXT NOT NULL DEFAULT '',
  sip_password_encrypted TEXT, -- Store encrypted, nullable for initial creation
  sip_domain TEXT NOT NULL DEFAULT '',
  outbound_proxy TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one SIP profile per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_sip_profiles_user ON sip_profiles(user_id);

-- ============================================
-- SMTP CONFIGURATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS smtp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL DEFAULT '',
  password_encrypted TEXT, -- Nullable for initial creation
  use_tls BOOLEAN DEFAULT TRUE,
  from_name TEXT,
  from_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE sip_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_configs ENABLE ROW LEVEL SECURITY;

-- SIP Profiles: User can only access their own
DROP POLICY IF EXISTS "sip_select" ON sip_profiles;
DROP POLICY IF EXISTS "sip_insert" ON sip_profiles;
DROP POLICY IF EXISTS "sip_update" ON sip_profiles;
DROP POLICY IF EXISTS "sip_delete" ON sip_profiles;

CREATE POLICY "sip_select" ON sip_profiles FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "sip_insert" ON sip_profiles FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "sip_update" ON sip_profiles FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "sip_delete" ON sip_profiles FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- SMTP: Org-level, all authenticated users in org can select, admins can modify
DROP POLICY IF EXISTS "smtp_select" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_insert" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_update" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_delete" ON smtp_configs;

CREATE POLICY "smtp_select" ON smtp_configs FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "smtp_insert" ON smtp_configs FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "smtp_update" ON smtp_configs FOR UPDATE
  USING (
    organization_id = get_user_org_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "smtp_delete" ON smtp_configs FOR DELETE
  USING (
    organization_id = get_user_org_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS set_updated_at ON smtp_configs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON smtp_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ADD phone COLUMN TO profiles IF NOT EXISTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
END $$;
