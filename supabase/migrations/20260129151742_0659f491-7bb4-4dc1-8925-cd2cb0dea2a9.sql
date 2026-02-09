-- Add units_per_package to items for unit conversion (purchase vs consumption)
ALTER TABLE public.items 
ADD COLUMN units_per_package integer NOT NULL DEFAULT 1;

-- Create restaurant_tables for table management
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number integer NOT NULL UNIQUE,
  capacity integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
  current_order_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table for managing table orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  waiter_id uuid NOT NULL,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items for items in each order
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  dish_id uuid REFERENCES public.dishes(id) ON DELETE SET NULL,
  dish_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add price to dishes
ALTER TABLE public.dishes 
ADD COLUMN price numeric NOT NULL DEFAULT 0;

-- Enable RLS on all new tables
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant_tables
CREATE POLICY "Authenticated users can view tables"
ON public.restaurant_tables FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tables"
ON public.restaurant_tables FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage tables"
ON public.restaurant_tables FOR ALL
USING (is_admin(auth.uid()));

-- RLS policies for orders
CREATE POLICY "Authenticated users can view orders"
ON public.orders FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orders"
ON public.orders FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
USING (is_admin(auth.uid()));

-- RLS policies for order_items
CREATE POLICY "Authenticated users can view order items"
ON public.order_items FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create order items"
ON public.order_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update order items"
ON public.order_items FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete order items"
ON public.order_items FOR DELETE
USING (is_admin(auth.uid()));

-- Enable realtime for tables and orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Insert default tables (8 tables)
INSERT INTO public.restaurant_tables (table_number, capacity) VALUES
(1, 4), (2, 4), (3, 2), (4, 6), (5, 4), (6, 2), (7, 8), (8, 4);