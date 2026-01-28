-- ============================================
-- Database Performance Indexes
-- ============================================
-- These indexes improve query performance for common access patterns

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING gin(
    to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(company, ''))
);

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date) WHERE expected_close_date IS NOT NULL;

-- Call logs indexes (handling both user_id and profile_id naming)
CREATE INDEX IF NOT EXISTS idx_call_logs_organization_id ON call_logs(organization_id);
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'profile_id') THEN
        CREATE INDEX IF NOT EXISTS idx_call_logs_profile_id ON call_logs(profile_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_call_logs_contact_id ON call_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact_id ON calendar_events(contact_id);

-- Email templates indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);

-- Automation rules indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_organization_id ON automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_is_active ON automation_rules(is_active) WHERE is_active = true;

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
-- No index on user_id needed if it's UNIQUE (already indexed)

-- ============================================
-- Analyze tables after creating indexes
-- ============================================
ANALYZE contacts;
ANALYZE deals;
ANALYZE call_logs;
ANALYZE tasks;
ANALYZE activities;
ANALYZE calendar_events;
ANALYZE email_templates;
ANALYZE automation_rules;
ANALYZE profiles;
