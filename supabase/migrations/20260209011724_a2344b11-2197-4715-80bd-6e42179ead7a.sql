
-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  restaurant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage categories" ON public.categories FOR ALL USING (auth.uid() IS NOT NULL);

-- Items table (inventory)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  min_stock NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  expiry_date DATE,
  price NUMERIC,
  direct_sale BOOLEAN DEFAULT false,
  units_per_package NUMERIC NOT NULL DEFAULT 1,
  last_count_date DATE,
  last_counted_by UUID,
  restaurant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage items" ON public.items FOR ALL USING (auth.uid() IS NOT NULL);

-- Restaurant tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'free',
  current_order_id UUID,
  restaurant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage restaurant_tables" ON public.restaurant_tables FOR ALL USING (auth.uid() IS NOT NULL);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  waiter_id UUID NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  total NUMERIC DEFAULT 0,
  guest_count INTEGER,
  customer_name TEXT,
  restaurant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage orders" ON public.orders FOR ALL USING (auth.uid() IS NOT NULL);

-- Dishes table (menu items)
CREATE TABLE IF NOT EXISTS public.dishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  restaurant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage dishes" ON public.dishes FOR ALL USING (auth.uid() IS NOT NULL);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL,
  dish_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage order_items" ON public.order_items FOR ALL USING (auth.uid() IS NOT NULL);

-- Technical sheets (recipe ingredients)
CREATE TABLE IF NOT EXISTS public.technical_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity_per_sale NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.technical_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage technical_sheets" ON public.technical_sheets FOR ALL USING (auth.uid() IS NOT NULL);

-- Stock history (audit trail)
CREATE TABLE IF NOT EXISTS public.stock_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  previous_stock NUMERIC,
  new_stock NUMERIC NOT NULL,
  previous_expiry DATE,
  new_expiry DATE,
  changed_by UUID NOT NULL,
  movement_type TEXT NOT NULL DEFAULT 'adjustment',
  reason TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage stock_history" ON public.stock_history FOR ALL USING (auth.uid() IS NOT NULL);

-- Bar closings (daily reports)
CREATE TABLE IF NOT EXISTS public.bar_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closed_by UUID NOT NULL,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  sales_by_waiter JSONB,
  expired_items JSONB,
  consumed_products JSONB,
  orders_summary JSONB,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.bar_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage bar_closings" ON public.bar_closings FOR ALL USING (auth.uid() IS NOT NULL);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
