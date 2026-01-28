-- NanoSol CRM: RBAC & Assignment Logic
-- 1. Update RLS for Contacts
DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;

-- Admin/Manager see all, Agent sees only assigned
CREATE POLICY "contacts_select_rbac" ON contacts FOR SELECT
USING (
  organization_id = get_user_org_id() AND (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('admin', 'manager') OR
    owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    owner_id IS NULL
  )
);

CREATE POLICY "contacts_update_rbac" ON contacts FOR UPDATE
USING (
  organization_id = get_user_org_id() AND (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('admin', 'manager') OR
    owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 2. Update RLS for Deals
DROP POLICY IF EXISTS "deals_select" ON deals;
DROP POLICY IF EXISTS "deals_update" ON deals;

CREATE POLICY "deals_select_rbac" ON deals FOR SELECT
USING (
  organization_id = get_user_org_id() AND (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('admin', 'manager') OR
    owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "deals_update_rbac" ON deals FOR UPDATE
USING (
  organization_id = get_user_org_id() AND (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('admin', 'manager') OR
    owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 3. Profile Management
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own profile
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read" ON profiles FOR SELECT
USING (user_id = auth.uid());

-- Allow members to see others in the same organization (for team list/assignment)
DROP POLICY IF EXISTS "profiles_org_read" ON profiles;
CREATE POLICY "profiles_org_read" ON profiles FOR SELECT
USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Admin Management (Update/Delete)
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
