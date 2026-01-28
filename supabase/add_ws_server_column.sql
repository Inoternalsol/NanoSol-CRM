-- Add ws_server column to sip_profiles for configurable WebSocket URL
-- Run this in your Supabase SQL Editor

ALTER TABLE sip_profiles ADD COLUMN IF NOT EXISTS ws_server TEXT;

-- Example: For illyvoip, try one of these formats:
-- wss://sip.illyvoip.com:8089/ws
-- wss://sip.illyvoip.com/ws
-- wss://ws.illyvoip.com
