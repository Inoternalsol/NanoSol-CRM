-- MASTER AUTOMATION MIGRATION (Ordered for Dependencies)

-- 1. Create Base Tables
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'waiting')),
    current_node_id TEXT,
    last_executed_at TIMESTAMPTZ DEFAULT NOW(),
    next_execution_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Tracking to Emails/Enrollments (If not already there)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='enrollment_id') THEN
        ALTER TABLE emails ADD COLUMN enrollment_id UUID REFERENCES sequence_enrollments(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='opened_at') THEN
        ALTER TABLE emails ADD COLUMN opened_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Utility Functions
CREATE OR REPLACE FUNCTION get_workflows_for_trigger(trigger_type_val TEXT)
RETURNS SETOF workflows AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM workflows
    WHERE is_active = TRUE
      AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(nodes) AS n 
          WHERE n->>'type' = 'trigger' 
            AND n->'data'->>'triggerType' = trigger_type_val
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger Functions
CREATE OR REPLACE FUNCTION handle_contact_created_workflow()
RETURNS TRIGGER AS $$
DECLARE
    wf RECORD;
BEGIN
    FOR wf IN SELECT * FROM get_workflows_for_trigger('contact_created') WHERE organization_id = NEW.organization_id LOOP
        INSERT INTO workflow_runs (
            organization_id, workflow_id, contact_id, status, current_node_id, next_execution_at
        ) VALUES (
            NEW.organization_id, wf.id, NEW.id, 'running', NULL, NOW()
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_deal_stage_changed_workflow()
RETURNS TRIGGER AS $$
DECLARE
    wf RECORD;
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) OR (TG_OP = 'INSERT') THEN
        FOR wf IN SELECT * FROM get_workflows_for_trigger('deal_stage_changed') WHERE organization_id = NEW.organization_id LOOP
            INSERT INTO workflow_runs (
                organization_id, workflow_id, contact_id, status, current_node_id, next_execution_at
            ) VALUES (
                NEW.organization_id, wf.id, NEW.contact_id, 'running', NULL, NOW()
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Triggers
DROP TRIGGER IF EXISTS tr_contact_created_workflow ON contacts;
CREATE TRIGGER tr_contact_created_workflow
AFTER INSERT ON contacts
FOR EACH ROW EXECUTE FUNCTION handle_contact_created_workflow();

DROP TRIGGER IF EXISTS tr_deal_stage_changed_workflow ON deals;
CREATE TRIGGER tr_deal_stage_changed_workflow
AFTER INSERT OR UPDATE OF stage ON deals
FOR EACH ROW EXECUTE FUNCTION handle_deal_stage_changed_workflow();

-- 6. RLS Policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflows_select" ON workflows;
CREATE POLICY "workflows_select" ON workflows FOR SELECT
    USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "workflows_all_admin" ON workflows;
CREATE POLICY "workflows_all_admin" ON workflows FOR ALL
    USING (organization_id = get_user_org_id() AND EXISTS (
        SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    ));
