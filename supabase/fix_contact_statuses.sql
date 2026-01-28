-- Add status column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- Create contact_statuses table
CREATE TABLE IF NOT EXISTS contact_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contact_statuses ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "statuses_select" ON contact_statuses FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "statuses_insert" ON contact_statuses FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "statuses_update" ON contact_statuses FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "statuses_delete" ON contact_statuses FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Optional: Seed with default organization if it exists
DO $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM organizations WHERE id = demo_org_id) THEN
    INSERT INTO contact_statuses (organization_id, name, label, color, "order")
    VALUES 
      (demo_org_id, 'new', 'New', 'gray', 1),
      (demo_org_id, 'contacted', 'Contacted', 'blue', 2),
      (demo_org_id, 'qualified', 'Qualified', 'green', 3),
      (demo_org_id, 'unqualified', 'Unqualified', 'red', 4),
      (demo_org_id, 'customer', 'Customer', 'purple', 5)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
