-- 1. Ensure the demo organization exists
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'demo')
ON CONFLICT (id) DO NOTHING;

-- 2. Link the current user's profile to the demo organization
-- This ensures that RLS checks for 'organization_id = get_user_org_id()' pass
UPDATE profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id = auth.uid();

-- 3. Ensure the contact_statuses table exists with correct columns
CREATE TABLE IF NOT EXISTS contact_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Re-apply RLS and Policies for contact_statuses
ALTER TABLE contact_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statuses_select" ON contact_statuses;
CREATE POLICY "statuses_select" ON contact_statuses FOR SELECT
  USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "statuses_insert" ON contact_statuses;
CREATE POLICY "statuses_insert" ON contact_statuses FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "statuses_update" ON contact_statuses;
CREATE POLICY "statuses_update" ON contact_statuses FOR UPDATE
  USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "statuses_delete" ON contact_statuses;
CREATE POLICY "statuses_delete" ON contact_statuses FOR DELETE
  USING (organization_id = get_user_org_id());

-- 5. Seed default statuses for the demo org if the table is empty
INSERT INTO contact_statuses (organization_id, name, label, color, "order")
SELECT '00000000-0000-0000-0000-000000000001', name, label, color, "order"
FROM (
  VALUES 
    ('new', 'New', 'gray', 1),
    ('contacted', 'Contacted', 'blue', 2),
    ('qualified', 'Qualified', 'green', 3),
    ('unqualified', 'Unqualified', 'red', 4),
    ('customer', 'Customer', 'purple', 5)
) AS defaults(name, label, color, "order")
WHERE NOT EXISTS (SELECT 1 FROM contact_statuses WHERE organization_id = '00000000-0000-0000-0000-000000000001');
