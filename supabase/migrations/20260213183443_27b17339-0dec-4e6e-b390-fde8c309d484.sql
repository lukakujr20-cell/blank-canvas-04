
-- Create restaurant_sessions table for shift/session management
CREATE TABLE public.restaurant_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  opened_by UUID NOT NULL,
  closed_by UUID,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can manage their own restaurant sessions
CREATE POLICY "Users can manage own restaurant sessions"
  ON public.restaurant_sessions
  FOR ALL
  USING (
    is_super_admin(auth.uid()) 
    OR restaurant_id = get_user_restaurant_id(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid()) 
    OR restaurant_id = get_user_restaurant_id(auth.uid())
  );

-- Add session_id column to orders table (nullable for backward compatibility)
ALTER TABLE public.orders
  ADD COLUMN session_id UUID REFERENCES public.restaurant_sessions(id);

-- Create index for performance
CREATE INDEX idx_orders_session_id ON public.orders(session_id);
CREATE INDEX idx_restaurant_sessions_restaurant_status ON public.restaurant_sessions(restaurant_id, status);
