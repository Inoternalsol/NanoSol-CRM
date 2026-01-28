-- Fix RLS policies for SIP and SMTP tables
-- Run this in your Supabase SQL Editor

-- ============================================
-- SIMPLIFIED SIP POLICIES
-- ============================================
DROP POLICY IF EXISTS "sip_select" ON sip_profiles;
DROP POLICY IF EXISTS "sip_insert" ON sip_profiles;
DROP POLICY IF EXISTS "sip_update" ON sip_profiles;
DROP POLICY IF EXISTS "sip_delete" ON sip_profiles;

-- Users can access their own SIP profile (matched via organization)
CREATE POLICY "sip_all" ON sip_profiles FOR ALL
  USING (organization_id = get_user_org_id());

-- ============================================
-- SIMPLIFIED SMTP POLICIES  
-- ============================================
DROP POLICY IF EXISTS "smtp_select" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_insert" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_update" ON smtp_configs;
DROP POLICY IF EXISTS "smtp_delete" ON smtp_configs;

-- All org members can access SMTP config
CREATE POLICY "smtp_all" ON smtp_configs FOR ALL
  USING (organization_id = get_user_org_id());

-- ============================================
-- VERIFY get_user_org_id function exists
-- ============================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;
