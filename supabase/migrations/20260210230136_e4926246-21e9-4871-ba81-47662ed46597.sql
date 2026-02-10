
-- Create POS categories table (separate from inventory categories)
CREATE TABLE public.pos_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  restaurant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage own restaurant pos_categories"
ON public.pos_categories
FOR ALL
USING (is_super_admin(auth.uid()) OR (restaurant_id = get_user_restaurant_id(auth.uid())))
WITH CHECK (is_super_admin(auth.uid()) OR (restaurant_id = get_user_restaurant_id(auth.uid())));

-- Add pos_category_id to dishes
ALTER TABLE public.dishes ADD COLUMN pos_category_id UUID REFERENCES public.pos_categories(id) ON DELETE SET NULL;

-- Add pos_category_id to items (for direct sale items)
ALTER TABLE public.items ADD COLUMN pos_category_id UUID REFERENCES public.pos_categories(id) ON DELETE SET NULL;
