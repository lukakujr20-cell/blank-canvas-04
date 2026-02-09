-- Add order tracking to stock_history for better auditing
ALTER TABLE public.stock_history 
ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
ADD COLUMN order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL;

-- Create index for performance when looking up history by order
CREATE INDEX IF NOT EXISTS idx_stock_history_order_id ON public.stock_history(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_order_item_id ON public.stock_history(order_item_id);

-- Add comment for documentation
COMMENT ON COLUMN public.stock_history.order_id IS 'Reference to the order that triggered this stock movement';
COMMENT ON COLUMN public.stock_history.order_item_id IS 'Reference to the specific order item that triggered this stock movement';