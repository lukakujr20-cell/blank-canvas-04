-- Add category_id to dishes table for PDV categorization
ALTER TABLE public.dishes ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_dishes_category_id ON public.dishes(category_id);