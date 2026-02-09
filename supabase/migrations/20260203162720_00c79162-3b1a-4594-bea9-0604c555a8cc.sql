-- Add 'cozinha' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cozinha';

-- Add index on order_items status for kitchen panel performance
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);

-- Add index on orders status for kitchen panel performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);