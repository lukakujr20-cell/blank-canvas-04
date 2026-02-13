
-- Create restaurant_settings table for per-restaurant configuration
CREATE TABLE public.restaurant_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL UNIQUE,
  iva_rate numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  locale text NOT NULL DEFAULT 'es',
  restaurant_display_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- RLS: users can read/write their own restaurant settings, super_admin can access all
CREATE POLICY "Users can manage own restaurant settings"
  ON public.restaurant_settings
  FOR ALL
  USING (
    is_super_admin(auth.uid()) 
    OR restaurant_id = get_user_restaurant_id(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid()) 
    OR restaurant_id = get_user_restaurant_id(auth.uid())
  );
