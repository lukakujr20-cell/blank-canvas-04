
-- 1. Create security definer function to check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Create function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- 3. Create function to get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- 4. Drop existing restrictive policy on profiles
DROP POLICY IF EXISTS "Users can crud their own data" ON public.profiles;

-- 5. Create new policies: users can manage own profile
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id);

-- 6. Super admin can read all profiles
CREATE POLICY "Super admin can read all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- 7. Super admin can update all profiles
CREATE POLICY "Super admin can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- 8. Host can read profiles in same restaurant
CREATE POLICY "Host can read restaurant profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'host')
  AND restaurant_id = public.get_user_restaurant_id(auth.uid())
);

-- 9. Create stock_batches table for FEFO
CREATE TABLE public.stock_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  expiry_date date,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  batch_note text,
  restaurant_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on stock_batches
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage stock_batches"
ON public.stock_batches
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Index for FEFO ordering (earliest expiry first)
CREATE INDEX idx_stock_batches_fefo ON public.stock_batches (item_id, expiry_date ASC NULLS LAST, created_at ASC);
