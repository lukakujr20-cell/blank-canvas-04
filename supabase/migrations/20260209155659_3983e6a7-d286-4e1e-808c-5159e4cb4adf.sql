
-- =============================================
-- DATA ISOLATION: RLS by restaurant_id
-- =============================================

-- 1. CATEGORIES
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;

CREATE POLICY "Users can manage own restaurant categories" ON public.categories
FOR ALL USING (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
);

-- 2. DISHES
DROP POLICY IF EXISTS "Authenticated users can manage dishes" ON public.dishes;

CREATE POLICY "Users can manage own restaurant dishes" ON public.dishes
FOR ALL USING (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
);

-- 3. ITEMS
DROP POLICY IF EXISTS "Authenticated users can manage items" ON public.items;

CREATE POLICY "Users can manage own restaurant items" ON public.items
FOR ALL USING (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
);

-- 4. ORDERS
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON public.orders;

CREATE POLICY "Users can manage own restaurant orders" ON public.orders
FOR ALL USING (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
);

-- 5. ORDER_ITEMS (via orders join)
DROP POLICY IF EXISTS "Authenticated users can manage order_items" ON public.order_items;

CREATE POLICY "Users can manage own restaurant order_items" ON public.order_items
FOR ALL USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.restaurant_id = get_user_restaurant_id(auth.uid())
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.restaurant_id = get_user_restaurant_id(auth.uid())
  )
);

-- 6. RESTAURANT_TABLES
DROP POLICY IF EXISTS "Authenticated users can manage restaurant_tables" ON public.restaurant_tables;

CREATE POLICY "Users can manage own restaurant tables" ON public.restaurant_tables
FOR ALL USING (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
);

-- 7. RESTAURANTS
DROP POLICY IF EXISTS "Authenticated users can manage restaurants" ON public.restaurants;

CREATE POLICY "Users can manage own restaurant" ON public.restaurants
FOR ALL USING (
  is_super_admin(auth.uid())
  OR id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR id = get_user_restaurant_id(auth.uid())
);

-- 8. SUPPLIERS
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;

CREATE POLICY "Users can manage own restaurant suppliers" ON public.suppliers
FOR ALL USING (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
);

-- 9. STOCK_BATCHES
DROP POLICY IF EXISTS "Authenticated users can manage stock_batches" ON public.stock_batches;

CREATE POLICY "Users can manage own restaurant stock_batches" ON public.stock_batches
FOR ALL USING (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR restaurant_id = get_user_restaurant_id(auth.uid())
);

-- 10. STOCK_HISTORY (via items join)
DROP POLICY IF EXISTS "Authenticated users can manage stock_history" ON public.stock_history;

CREATE POLICY "Users can manage own restaurant stock_history" ON public.stock_history
FOR ALL USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.items
    WHERE items.id = stock_history.item_id
    AND items.restaurant_id = get_user_restaurant_id(auth.uid())
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.items
    WHERE items.id = stock_history.item_id
    AND items.restaurant_id = get_user_restaurant_id(auth.uid())
  )
);

-- 11. TECHNICAL_SHEETS (via dishes join)
DROP POLICY IF EXISTS "Authenticated users can manage technical_sheets" ON public.technical_sheets;

CREATE POLICY "Users can manage own restaurant technical_sheets" ON public.technical_sheets
FOR ALL USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dishes
    WHERE dishes.id = technical_sheets.dish_id
    AND dishes.restaurant_id = get_user_restaurant_id(auth.uid())
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dishes
    WHERE dishes.id = technical_sheets.dish_id
    AND dishes.restaurant_id = get_user_restaurant_id(auth.uid())
  )
);

-- 12. BAR_CLOSINGS (no restaurant_id - restrict to admins/hosts + super_admin)
DROP POLICY IF EXISTS "Authenticated users can manage bar_closings" ON public.bar_closings;

CREATE POLICY "Admins can manage bar_closings" ON public.bar_closings
FOR ALL USING (
  is_super_admin(auth.uid())
  OR has_role(auth.uid(), 'host')
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR has_role(auth.uid(), 'host')
  OR has_role(auth.uid(), 'admin')
);
