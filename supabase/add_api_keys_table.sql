-- Migration: Add API Keys Table for AI Providers
-- Run this in your Supabase SQL Editor

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  openai_key_encrypted TEXT,
  gemini_key_encrypted TEXT,
  qwen_key_encrypted TEXT,
  kimi_key_encrypted TEXT,
  active_provider TEXT DEFAULT 'openai' CHECK (active_provider IN ('openai', 'gemini', 'qwen', 'kimi')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins/managers can see/modify API keys
DROP POLICY IF EXISTS "api_keys_select" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON api_keys;

CREATE POLICY "api_keys_select" ON api_keys FOR SELECT
  USING (
    organization_id = get_user_org_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE
  USING (
    organization_id = get_user_org_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE
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
DROP TRIGGER IF EXISTS set_updated_at ON api_keys;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
