-- Add guest_count to orders table for tracking occupancy
ALTER TABLE public.orders 
ADD COLUMN guest_count INTEGER DEFAULT 1,
ADD COLUMN customer_name TEXT DEFAULT NULL;

-- Update restaurant_tables to support 'reserved' status (already a text field, no change needed)
-- Add index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(status);