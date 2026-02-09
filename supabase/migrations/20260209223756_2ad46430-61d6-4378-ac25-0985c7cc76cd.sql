
-- Add a permissive baseline policy requiring authentication for all access to profiles
CREATE POLICY "Require authentication for profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
