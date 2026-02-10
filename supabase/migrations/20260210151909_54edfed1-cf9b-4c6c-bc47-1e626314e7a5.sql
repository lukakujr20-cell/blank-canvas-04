
-- Drop existing permissive policies on profiles that are too broad
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own and same restaurant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Prevent Hosts from accessing Super Admin profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

-- SELECT: Users can only see profiles within their own restaurant_id
-- Super admins can see all profiles
CREATE POLICY "profiles_select_own_restaurant"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR id = auth.uid()
  OR (
    restaurant_id IS NOT NULL
    AND restaurant_id = public.get_user_restaurant_id(auth.uid())
  )
);

-- UPDATE: Users can only update their own profile
-- Super admins can update any profile
CREATE POLICY "profiles_update_own_or_superadmin"
ON public.profiles FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR id = auth.uid()
);

-- INSERT: Only super_admin or service role can insert
-- (edge functions use service role for profile creation)
CREATE POLICY "profiles_insert_superadmin_or_self"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR id = auth.uid()
);

-- DELETE: Only super_admin can delete profiles
CREATE POLICY "profiles_delete_superadmin_only"
ON public.profiles FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
);
