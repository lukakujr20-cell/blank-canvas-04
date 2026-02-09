-- Add movement_type and reason columns to stock_history for withdrawal tracking
ALTER TABLE public.stock_history 
ADD COLUMN IF NOT EXISTS movement_type text NOT NULL DEFAULT 'adjustment',
ADD COLUMN IF NOT EXISTS reason text;

-- Add check constraint for movement_type values
ALTER TABLE public.stock_history 
ADD CONSTRAINT stock_history_movement_type_check 
CHECK (movement_type IN ('entry', 'withdrawal', 'adjustment'));

-- Create RESTRICTIVE policy to DENY DELETE for ALL users (including admins)
-- This ensures audit trail integrity
CREATE POLICY "No one can delete stock history"
ON public.stock_history
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- Create RESTRICTIVE policy to DENY UPDATE for ALL users (including admins)
-- This ensures audit trail integrity  
CREATE POLICY "No one can update stock history"
ON public.stock_history
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false);

-- Enable realtime for items table to support real-time stock updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;