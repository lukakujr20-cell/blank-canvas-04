-- Update is_admin function to include 'host' role (host has all admin privileges)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'host')
$$;