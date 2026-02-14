
-- Add soft delete column to items
ALTER TABLE public.items ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Add soft delete column to categories
ALTER TABLE public.categories ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Add soft delete column to dishes (for POS products)
ALTER TABLE public.dishes ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Create index for efficient filtering of active records
CREATE INDEX idx_items_deleted_at ON public.items (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_deleted_at ON public.categories (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_dishes_deleted_at ON public.dishes (deleted_at) WHERE deleted_at IS NULL;
