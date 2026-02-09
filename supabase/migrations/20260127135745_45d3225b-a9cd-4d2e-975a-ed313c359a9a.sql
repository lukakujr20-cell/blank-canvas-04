-- Drop the permissive update policy that allows all authenticated users to update any field
DROP POLICY IF EXISTS "Authenticated users can update stock" ON public.items;

-- Create a restrictive policy that limits non-admin users to only update stock-related fields
-- This policy only allows updates when non-stock fields remain unchanged
CREATE POLICY "Staff can only update stock fields" 
ON public.items
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (
  -- Admins can update any field
  public.is_admin(auth.uid()) 
  OR 
  -- Non-admins can only update stock-related fields (current_stock, expiry_date, last_count_date, last_counted_by, updated_at)
  -- All other fields must remain unchanged - we cannot use NEW/OLD in WITH CHECK directly,
  -- so we'll use a trigger-based approach instead
  (auth.uid() IS NOT NULL)
);

-- Drop the above policy as we need a different approach using a trigger
DROP POLICY IF EXISTS "Staff can only update stock fields" ON public.items;

-- Recreate: Admins can update any field on items
-- (Already exists but we ensure it's there)

-- Create a function to validate staff updates
CREATE OR REPLACE FUNCTION public.validate_staff_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to update any field
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- For non-admins (staff), only allow changes to stock-related fields
  -- Check if protected fields are being modified
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'Staff cannot modify item name';
  END IF;
  
  IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    RAISE EXCEPTION 'Staff cannot modify item category';
  END IF;
  
  IF NEW.unit IS DISTINCT FROM OLD.unit THEN
    RAISE EXCEPTION 'Staff cannot modify item unit';
  END IF;
  
  IF NEW.min_stock IS DISTINCT FROM OLD.min_stock THEN
    RAISE EXCEPTION 'Staff cannot modify minimum stock threshold';
  END IF;
  
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Staff cannot modify item creator';
  END IF;
  
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Staff cannot modify creation date';
  END IF;
  
  -- Staff cannot decrease stock - must use withdrawal flow
  IF NEW.current_stock < OLD.current_stock THEN
    RAISE EXCEPTION 'Staff cannot decrease stock directly. Use the stock withdrawal flow instead.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce the validation
DROP TRIGGER IF EXISTS validate_staff_item_update_trigger ON public.items;

CREATE TRIGGER validate_staff_item_update_trigger
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.validate_staff_item_update();

-- Recreate a simple policy that allows authenticated users to attempt updates
-- The trigger will enforce the actual restrictions
CREATE POLICY "Authenticated users can update stock"
ON public.items
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);