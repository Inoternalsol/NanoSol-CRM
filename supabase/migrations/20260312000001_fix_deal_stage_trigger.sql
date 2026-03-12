-- Fix deal stage changed workflow trigger: column is 'stage' not 'stage_id'
CREATE OR REPLACE FUNCTION handle_deal_stage_changed_workflow()
RETURNS TRIGGER AS $$
DECLARE
    wf RECORD;
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) OR (TG_OP = 'INSERT') THEN
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

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
