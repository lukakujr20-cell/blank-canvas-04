
-- Create table_reservations table
CREATE TABLE public.table_reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  reserved_at timestamp with time zone NOT NULL,
  party_size integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage own restaurant reservations"
ON public.table_reservations
FOR ALL
USING (is_super_admin(auth.uid()) OR (restaurant_id = get_user_restaurant_id(auth.uid())))
WITH CHECK (is_super_admin(auth.uid()) OR (restaurant_id = get_user_restaurant_id(auth.uid())));

-- Index for performance
CREATE INDEX idx_table_reservations_restaurant ON public.table_reservations(restaurant_id);
CREATE INDEX idx_table_reservations_table ON public.table_reservations(table_id);
CREATE INDEX idx_table_reservations_date ON public.table_reservations(reserved_at);
