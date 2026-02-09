-- Create helper function to check if user is host
CREATE OR REPLACE FUNCTION public.is_host(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT public.has_role(_user_id, 'host')
$$;

-- Create function to get user role level (for hierarchy checks)
CREATE OR REPLACE FUNCTION public.get_role_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT CASE 
        WHEN public.has_role(_user_id, 'host') THEN 3
        WHEN public.has_role(_user_id, 'admin') THEN 2
        WHEN public.has_role(_user_id, 'staff') THEN 1
        ELSE 0
    END
$$;

-- Create function to check if user can manage another user
CREATE OR REPLACE FUNCTION public.can_manage_user(_manager_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT public.get_role_level(_manager_id) > public.get_role_level(_target_id)
        OR (_manager_id = _target_id)
        OR public.is_host(_manager_id)
$$;

-- Update profiles RLS: Host can view all, Admin can view non-host profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Host can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_host(auth.uid()));

CREATE POLICY "Admins can view non-host profiles"
ON public.profiles
FOR SELECT
USING (
    public.is_admin(auth.uid()) 
    AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = profiles.user_id AND role = 'host'
    )
);

-- Update user_roles RLS for the new hierarchy
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Host can do everything with roles
CREATE POLICY "Host can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_host(auth.uid()));

CREATE POLICY "Host can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_host(auth.uid()));

CREATE POLICY "Host can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_host(auth.uid()));

CREATE POLICY "Host can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_host(auth.uid()));

-- Admin can only manage staff roles (view admin and staff, but only modify staff)
CREATE POLICY "Admins can view non-host roles"
ON public.user_roles
FOR SELECT
USING (
    public.is_admin(auth.uid()) 
    AND role != 'host'
);

CREATE POLICY "Admins can insert staff roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
    public.is_admin(auth.uid()) 
    AND role = 'staff'
);

CREATE POLICY "Admins can update staff roles"
ON public.user_roles
FOR UPDATE
USING (
    public.is_admin(auth.uid()) 
    AND role = 'staff'
);

CREATE POLICY "Admins can delete staff roles"
ON public.user_roles
FOR DELETE
USING (
    public.is_admin(auth.uid()) 
    AND role = 'staff'
);