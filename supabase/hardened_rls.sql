-- NanoSol CRM: Ultra-Hardened RLS & RBAC (v4 - THE FINAL BOSS)
-- This script WIPES EVERYTHING and reconstructs strict isolation from scratch.

-- ============================================
-- 0. THE NUKE: Wipe ALL existing policies
-- ============================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ============================================
-- 0.1 PERFORMANCE INDEXES (FOR RLS)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_org_perf ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_org_perf ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_perf ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_perf ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_perf ON profiles(user_id);

-- ============================================
-- 1. SECURITY DEFINER FUNCTIONS (STABLE for Performance)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
  -- Using STABLE ensures the value is cached within a single query's transaction
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_org()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2. ORGANIZATIONS & PROFILES
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_own" ON organizations FOR SELECT TO authenticated USING (id = public.get_current_user_org());

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager'));
CREATE POLICY "profiles_select_org" ON profiles FOR SELECT TO authenticated USING (organization_id = public.get_current_user_org());
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 3. CONTACTS (THE CORE OF ISOLATION)
-- ============================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY; -- Extra safety

CREATE POLICY "contacts_admin_all" ON contacts FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());

CREATE POLICY "contacts_agent_access" ON contacts FOR ALL TO authenticated
USING (public.get_current_user_role() = 'agent' AND owner_id = public.get_current_user_profile_id())
WITH CHECK (public.get_current_user_role() = 'agent' AND owner_id = public.get_current_user_profile_id());

-- ============================================
-- 4. DEALS (Linked isolation)
-- ============================================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals FORCE ROW LEVEL SECURITY;

CREATE POLICY "deals_admin_all" ON deals FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());

CREATE POLICY "deals_agent_access" ON deals FOR ALL TO authenticated
USING (public.get_current_user_role() = 'agent' AND owner_id = public.get_current_user_profile_id())
WITH CHECK (
  public.get_current_user_role() = 'agent' 
  AND owner_id = public.get_current_user_profile_id()
  -- Ensure linked contact is ALSO owned by them
  AND (contact_id IS NULL OR EXISTS (SELECT 1 FROM contacts WHERE id = deals.contact_id AND owner_id = public.get_current_user_profile_id()))
);

-- ============================================
-- 5. PIPELINES (Read-only for agents)
-- ============================================
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipelines_select_org" ON pipelines FOR SELECT TO authenticated USING (organization_id = public.get_current_user_org());
CREATE POLICY "pipelines_admin_all" ON pipelines FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager'));

-- ============================================
-- 6. ACTIVITIES & TASKS
-- ============================================
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_admin_all" ON activities FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
CREATE POLICY "activities_agent_access" ON activities FOR ALL TO authenticated 
USING (public.get_current_user_role() = 'agent' AND created_by = public.get_current_user_profile_id());

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_admin_all" ON tasks FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
CREATE POLICY "tasks_agent_access" ON tasks FOR ALL TO authenticated 
USING (public.get_current_user_role() = 'agent' AND assigned_to = public.get_current_user_profile_id());

-- ============================================
-- 7. CALENDAR, SIP, SMTP
-- ============================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'calendar_events') THEN
        ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "events_admin" ON calendar_events FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "events_agent" ON calendar_events FOR ALL TO authenticated USING (public.get_current_user_role() = 'agent' AND created_by = public.get_current_user_profile_id());
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sip_profiles') THEN
        ALTER TABLE sip_profiles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "sip_admin" ON sip_profiles FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "sip_agent" ON sip_profiles FOR ALL TO authenticated USING (public.get_current_user_role() = 'agent' AND user_id = public.get_current_user_profile_id());
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'smtp_configs') THEN
        ALTER TABLE smtp_configs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "smtp_admin" ON smtp_configs FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
    END IF;
END $$;

-- ============================================
-- 8. AUTOMATION, FILES, NOTES
-- ============================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'email_templates') THEN
        ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "templates_admin" ON email_templates FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "templates_agent" ON email_templates FOR SELECT TO authenticated USING (organization_id = public.get_current_user_org());
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'files') THEN
        ALTER TABLE files ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "files_admin" ON files FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "files_agent" ON files FOR ALL TO authenticated USING (public.get_current_user_role() = 'agent' AND uploaded_by = public.get_current_user_profile_id());
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notes') THEN
        ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "notes_admin" ON notes FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "notes_agent" ON notes FOR ALL TO authenticated USING (public.get_current_user_role() = 'agent' AND created_by = public.get_current_user_profile_id());
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'call_logs') THEN
        ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "call_logs_admin" ON call_logs FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "call_logs_agent" ON call_logs FOR ALL TO authenticated USING (public.get_current_user_role() = 'agent' AND user_id = public.get_current_user_profile_id());
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflows') THEN
        ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "workflows_admin" ON workflows FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "workflows_agent" ON workflows FOR SELECT TO authenticated USING (organization_id = public.get_current_user_org());
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflow_runs') THEN
        ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "runs_admin" ON workflow_runs FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'manager') AND organization_id = public.get_current_user_org());
        CREATE POLICY "runs_agent" ON workflow_runs FOR SELECT TO authenticated USING (organization_id = public.get_current_user_org());
    END IF;
END $$;

-- ============================================
-- 9. AUTO-ASSIGNMENT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_auto_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_profile_id uuid;
BEGIN
  SELECT role, id INTO v_role, v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_role = 'agent' THEN
    IF TG_TABLE_NAME = 'tasks' THEN NEW.assigned_to := v_profile_id;
    ELSIF TG_TABLE_NAME IN ('contacts', 'deals') THEN NEW.owner_id := v_profile_id;
    ELSIF TG_TABLE_NAME = 'calendar_events' THEN NEW.created_by := v_profile_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_contacts_auto_assign ON contacts;
CREATE TRIGGER tr_contacts_auto_assign BEFORE INSERT ON contacts FOR EACH ROW EXECUTE FUNCTION public.handle_auto_assignment();

DROP TRIGGER IF EXISTS tr_deals_auto_assign ON deals;
CREATE TRIGGER tr_deals_auto_assign BEFORE INSERT ON deals FOR EACH ROW EXECUTE FUNCTION public.handle_auto_assignment();

DROP TRIGGER IF EXISTS tr_tasks_auto_assign ON tasks;
CREATE TRIGGER tr_tasks_auto_assign BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION public.handle_auto_assignment();
