-- Add DELETE policies for profiles table to allow proper user deletion cascade
-- Host can delete any profile
CREATE POLICY "Host can delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_host(auth.uid()));

-- Admins can delete non-host profiles (staff only)
CREATE POLICY "Admins can delete staff profiles"
ON public.profiles
FOR DELETE
USING (
  public.is_admin(auth.uid()) 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.user_id 
    AND user_roles.role = 'host'
  )
);