-- Add Janus-specific columns to sip_profiles
ALTER TABLE sip_profiles 
ADD COLUMN IF NOT EXISTS janus_url TEXT,
ADD COLUMN IF NOT EXISTS janus_secret TEXT;

-- Update comments for clarity
COMMENT ON COLUMN sip_profiles.janus_url IS 'WebSocket URL of the Janus Gateway (e.g., wss://janus.domain.com/janus)';
COMMENT ON COLUMN sip_profiles.janus_secret IS 'Optional API secret for Janus Gateway authentication';
