-- Create bar_closings table to store daily closing reports
CREATE TABLE public.bar_closings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closed_by uuid NOT NULL,
  closed_at timestamp with time zone NOT NULL DEFAULT now(),
  total_revenue numeric NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  sales_by_waiter jsonb NOT NULL DEFAULT '[]'::jsonb,
  expired_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  consumed_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  orders_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bar_closings ENABLE ROW LEVEL SECURITY;

-- Only Host can view bar closings (for PDF export history)
CREATE POLICY "Host can view bar closings"
ON public.bar_closings
FOR SELECT
USING (public.is_host(auth.uid()));

-- Only Host can create bar closings
CREATE POLICY "Host can create bar closings"
ON public.bar_closings
FOR INSERT
WITH CHECK (public.is_host(auth.uid()));

-- Admins can also create bar closings
CREATE POLICY "Admins can create bar closings"
ON public.bar_closings
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- No one can update or delete bar closings (immutable audit trail)
CREATE POLICY "No updates to bar closings"
ON public.bar_closings
FOR UPDATE
USING (false);

CREATE POLICY "No deletes to bar closings"
ON public.bar_closings
FOR DELETE
USING (false);

-- Create index for faster queries
CREATE INDEX idx_bar_closings_closed_at ON public.bar_closings(closed_at DESC);