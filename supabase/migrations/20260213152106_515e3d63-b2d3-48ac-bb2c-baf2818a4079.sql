
-- Create user_permissions table for granular access control
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Host/Admin can read permissions of users in their restaurant
CREATE POLICY "Users can read own permissions"
ON public.user_permissions
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.id = auth.uid()
        AND p2.id = user_permissions.user_id
        AND p1.restaurant_id = p2.restaurant_id
        AND p1.restaurant_id IS NOT NULL
        AND (has_role(auth.uid(), 'host') OR has_role(auth.uid(), 'admin'))
    )
  )
);

-- Host/Super admin can manage permissions
CREATE POLICY "Host can manage permissions"
ON public.user_permissions
FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'host')
    AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.id = auth.uid()
        AND p2.id = user_permissions.user_id
        AND p1.restaurant_id = p2.restaurant_id
        AND p1.restaurant_id IS NOT NULL
    )
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'host')
    AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.id = auth.uid()
        AND p2.id = user_permissions.user_id
        AND p1.restaurant_id = p2.restaurant_id
        AND p1.restaurant_id IS NOT NULL
    )
  )
);

-- Create a helper function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT granted FROM public.user_permissions WHERE user_id = _user_id AND permission = _permission),
    true  -- default: granted if no explicit row exists
  )
$$;
