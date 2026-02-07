-- Migration: Enable Multiple SIP Accounts Per User
-- Run this in your Supabase SQL Editor
-- This migration enables users to have multiple SIP accounts (similar to email accounts)

-- ============================================
-- STEP 1: Drop existing unique constraint
-- ============================================
DROP INDEX IF EXISTS idx_sip_profiles_user;

-- ============================================
-- STEP 2: Add new columns for multi-account support
-- ============================================
ALTER TABLE sip_profiles 
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Default SIP Account',
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS websocket_server TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- STEP 3: Create new indexes
-- ============================================
-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_sip_profiles_user_id ON sip_profiles(user_id);

-- Index for faster lookups by organization
CREATE INDEX IF NOT EXISTS idx_sip_profiles_org_id ON sip_profiles(organization_id);

-- Unique index: only one default account per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_sip_profiles_user_default 
ON sip_profiles(user_id) 
WHERE is_default = TRUE;

-- ============================================
-- STEP 4: Update existing records
-- ============================================
-- Set existing records as default for their users
UPDATE sip_profiles 
SET is_default = TRUE, name = 'Primary SIP Account' 
WHERE id IN (
    SELECT DISTINCT ON (user_id) id 
    FROM sip_profiles 
    ORDER BY user_id, created_at ASC
);

-- ============================================
-- STEP 5: Update RLS Policies
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "sip_select" ON sip_profiles;
DROP POLICY IF EXISTS "sip_insert" ON sip_profiles;
DROP POLICY IF EXISTS "sip_update" ON sip_profiles;
DROP POLICY IF EXISTS "sip_delete" ON sip_profiles;

-- Recreate policies for multi-account access
-- Users can view their own accounts OR org-wide accounts in their organization
CREATE POLICY "sip_select" ON sip_profiles FOR SELECT
USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Users can insert their own accounts
CREATE POLICY "sip_insert" ON sip_profiles FOR INSERT
WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Users can update their own accounts
CREATE POLICY "sip_update" ON sip_profiles FOR UPDATE
USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Users can delete their own accounts
CREATE POLICY "sip_delete" ON sip_profiles FOR DELETE
USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================
-- STEP 6: Create trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_sip_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sip_profiles_updated_at ON sip_profiles;
CREATE TRIGGER trigger_sip_profiles_updated_at
    BEFORE UPDATE ON sip_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_sip_profile_updated_at();

-- ============================================
-- STEP 7: Helper function to ensure one default per user
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_default_sip()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this account as default, unset others for this user
    IF NEW.is_default = TRUE THEN
        UPDATE sip_profiles 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_sip ON sip_profiles;
CREATE TRIGGER trigger_ensure_single_default_sip
    BEFORE INSERT OR UPDATE ON sip_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_sip();
