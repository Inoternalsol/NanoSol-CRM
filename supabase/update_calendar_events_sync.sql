-- Add external_id for sync idempotency
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'error')) DEFAULT 'pending';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Unique constraint on external_id per organization to allow cross-org sync if needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_external_id ON calendar_events(external_id) WHERE external_id IS NOT NULL;
