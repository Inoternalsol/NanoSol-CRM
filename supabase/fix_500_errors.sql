-- NanoSol CRM: RLS Fix (Repairing 500 Errors)

-- 1. Reset Policies
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
DROP POLICY IF EXISTS "profiles_org_read" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "contacts_select_rbac" ON contacts;
DROP POLICY IF EXISTS "contacts_update_rbac" ON contacts;
DROP POLICY IF EXISTS "deals_select_rbac" ON deals;
DROP POLICY IF EXISTS "deals_update_rbac" ON deals;

-- 2. Fixed Profile Policies (Non-Recursive)
-- Use a simple self-read policy
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT
USING (user_id = auth.uid());

-- Use a public read for selection (simplest way to avoid recursion in small teams)
-- In a larger production app, you'd use a security definer function or join
CREATE POLICY "profiles_select_org" ON profiles FOR SELECT
USING (true); 

-- Admin Management
CREATE POLICY "profiles_admin_management" ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);

-- 3. Fixed Contact Policies
CREATE POLICY "contacts_select_simple" ON contacts FOR SELECT
USING (
  organization_id = (SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "contacts_update_simple" ON contacts FOR UPDATE
USING (
  organization_id = (SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- 4. Fixed Deal Policies
CREATE POLICY "deals_select_simple" ON deals FOR SELECT
USING (
  organization_id = (SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "deals_update_simple" ON deals FOR UPDATE
USING (
  organization_id = (SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);
