
-- Add destination routing to pos_categories (kitchen or bar)
ALTER TABLE public.pos_categories 
ADD COLUMN IF NOT EXISTS destination TEXT NOT NULL DEFAULT 'kitchen';

-- Add destination to order_items (where each item was routed)
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'kitchen';

-- Add consumption type to orders (dine_in or takeaway)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS consumption_type TEXT DEFAULT 'dine_in';
