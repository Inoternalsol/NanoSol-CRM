-- Migration: Expand SIP Configuration for broader provider support
-- Adds sip_auth_user and sip_protocol to support providers like Zoiper, Linphone, etc.

ALTER TABLE sip_profiles 
ADD COLUMN IF NOT EXISTS sip_auth_user TEXT,
ADD COLUMN IF NOT EXISTS sip_protocol TEXT DEFAULT 'wss',
ADD COLUMN IF NOT EXISTS registrar_server TEXT;

COMMENT ON COLUMN sip_profiles.sip_auth_user IS 'Authorization username (often different from SIP username/extension)';
COMMENT ON COLUMN sip_profiles.sip_protocol IS 'Connection protocol: wss (recommended), ws, etc.';
