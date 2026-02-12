-- Allow users to view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to view profiles in their organization (existing policy, kept for reference/completeness)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (organization_id = get_user_org_id());
