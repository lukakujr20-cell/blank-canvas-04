
-- Add payment_method column to orders for financial reporting
ALTER TABLE public.orders ADD COLUMN payment_method text NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.orders.payment_method IS 'Payment method: cash, card, other. Used for financial reports only.';
