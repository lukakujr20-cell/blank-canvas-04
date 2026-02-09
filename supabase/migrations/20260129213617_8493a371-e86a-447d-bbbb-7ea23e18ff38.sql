-- Step 2: Create restaurants table for multi-tenancy
CREATE TABLE public.restaurants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_payment', 'suspended')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 3: Add restaurant_id to all data tables
ALTER TABLE public.categories ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.items ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.dishes ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.restaurant_tables ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.stock_history ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.bar_closings ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.technical_sheets ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.custom_columns ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.custom_column_values ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Step 4: Add restaurant_id to profiles (user belongs to a restaurant)
ALTER TABLE public.profiles ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL;

-- Step 5: Create function to get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT restaurant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Step 6: Create function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Step 7: Create function to check if user belongs to same restaurant
CREATE OR REPLACE FUNCTION public.same_restaurant(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.get_user_restaurant_id(_user_id) = _restaurant_id
$$;

-- Step 8: Enable RLS on restaurants table
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS policies for restaurants table
CREATE POLICY "Super admin can view all restaurants"
ON public.restaurants FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can insert restaurants"
ON public.restaurants FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update restaurants"
ON public.restaurants FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete restaurants"
ON public.restaurants FOR DELETE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Host can view own restaurant"
ON public.restaurants FOR SELECT
USING (owner_id = auth.uid() OR public.same_restaurant(auth.uid(), id));

-- Step 10: Create indexes for performance
CREATE INDEX idx_categories_restaurant_id ON public.categories(restaurant_id);
CREATE INDEX idx_items_restaurant_id ON public.items(restaurant_id);
CREATE INDEX idx_dishes_restaurant_id ON public.dishes(restaurant_id);
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX idx_restaurant_tables_restaurant_id ON public.restaurant_tables(restaurant_id);
CREATE INDEX idx_suppliers_restaurant_id ON public.suppliers(restaurant_id);
CREATE INDEX idx_stock_history_restaurant_id ON public.stock_history(restaurant_id);
CREATE INDEX idx_bar_closings_restaurant_id ON public.bar_closings(restaurant_id);
CREATE INDEX idx_profiles_restaurant_id ON public.profiles(restaurant_id);

-- Step 11: Update trigger for restaurants updated_at
CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();