-- Update RLS policies for multi-tenancy isolation

-- CATEGORIES: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Super admin can manage all categories"
ON public.categories FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant categories"
ON public.categories FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage own restaurant categories"
ON public.categories FOR ALL
USING (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

-- ITEMS: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.items;
DROP POLICY IF EXISTS "Admins can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;
DROP POLICY IF EXISTS "Admins can insert items" ON public.items;
DROP POLICY IF EXISTS "Staff can insert items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can update stock" ON public.items;

CREATE POLICY "Super admin can manage all items"
ON public.items FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant items"
ON public.items FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can manage own restaurant items"
ON public.items FOR ALL
USING (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Staff can insert items in own restaurant"
ON public.items FOR INSERT
WITH CHECK (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Staff can update stock in own restaurant"
ON public.items FOR UPDATE
USING (public.same_restaurant(auth.uid(), restaurant_id));

-- DISHES: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view dishes" ON public.dishes;
DROP POLICY IF EXISTS "Admins can manage dishes" ON public.dishes;

CREATE POLICY "Super admin can manage all dishes"
ON public.dishes FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant dishes"
ON public.dishes FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can manage own restaurant dishes"
ON public.dishes FOR ALL
USING (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

-- ORDERS: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

CREATE POLICY "Super admin can manage all orders"
ON public.orders FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant orders"
ON public.orders FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Users can create orders in own restaurant"
ON public.orders FOR INSERT
WITH CHECK (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Users can update orders in own restaurant"
ON public.orders FOR UPDATE
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can delete orders in own restaurant"
ON public.orders FOR DELETE
USING (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

-- RESTAURANT_TABLES: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Authenticated users can update tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admins can manage tables" ON public.restaurant_tables;

CREATE POLICY "Super admin can manage all tables"
ON public.restaurant_tables FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant tables"
ON public.restaurant_tables FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Users can update own restaurant tables"
ON public.restaurant_tables FOR UPDATE
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can manage own restaurant tables"
ON public.restaurant_tables FOR ALL
USING (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

-- SUPPLIERS: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;

CREATE POLICY "Super admin can manage all suppliers"
ON public.suppliers FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant suppliers"
ON public.suppliers FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can manage own restaurant suppliers"
ON public.suppliers FOR ALL
USING (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

-- STOCK_HISTORY: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view history" ON public.stock_history;
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.stock_history;

CREATE POLICY "Super admin can view all stock history"
ON public.stock_history FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant stock history"
ON public.stock_history FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Users can insert stock history in own restaurant"
ON public.stock_history FOR INSERT
WITH CHECK (public.same_restaurant(auth.uid(), restaurant_id));

-- BAR_CLOSINGS: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Host can view bar closings" ON public.bar_closings;
DROP POLICY IF EXISTS "Host can create bar closings" ON public.bar_closings;
DROP POLICY IF EXISTS "Admins can create bar closings" ON public.bar_closings;

CREATE POLICY "Super admin can view all bar closings"
ON public.bar_closings FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Host can view own restaurant bar closings"
ON public.bar_closings FOR SELECT
USING (public.is_host(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can create bar closings in own restaurant"
ON public.bar_closings FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

-- TECHNICAL_SHEETS: Drop existing and recreate with restaurant isolation
DROP POLICY IF EXISTS "Authenticated users can view technical sheets" ON public.technical_sheets;
DROP POLICY IF EXISTS "Admins can manage technical sheets" ON public.technical_sheets;

CREATE POLICY "Super admin can manage all technical sheets"
ON public.technical_sheets FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own restaurant technical sheets"
ON public.technical_sheets FOR SELECT
USING (public.same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can manage own restaurant technical sheets"
ON public.technical_sheets FOR ALL
USING (public.is_admin(auth.uid()) AND public.same_restaurant(auth.uid(), restaurant_id));

-- ORDER_ITEMS: Update for restaurant isolation through orders table
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;

CREATE POLICY "Super admin can manage all order items"
ON public.order_items FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view order items from own restaurant orders"
ON public.order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND public.same_restaurant(auth.uid(), orders.restaurant_id)
    )
);

CREATE POLICY "Users can create order items for own restaurant orders"
ON public.order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND public.same_restaurant(auth.uid(), orders.restaurant_id)
    )
);

CREATE POLICY "Users can update order items for own restaurant orders"
ON public.order_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND public.same_restaurant(auth.uid(), orders.restaurant_id)
    )
);

CREATE POLICY "Admins can delete order items for own restaurant orders"
ON public.order_items FOR DELETE
USING (
    public.is_admin(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND public.same_restaurant(auth.uid(), orders.restaurant_id)
    )
);