
-- Drop existing foreign keys and recreate with ON DELETE CASCADE

-- items.category_id -> categories.id
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_category_id_fkey;
ALTER TABLE public.items ADD CONSTRAINT items_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

-- technical_sheets.item_id -> items.id
ALTER TABLE public.technical_sheets DROP CONSTRAINT IF EXISTS technical_sheets_item_id_fkey;
ALTER TABLE public.technical_sheets ADD CONSTRAINT technical_sheets_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

-- technical_sheets.dish_id -> dishes.id
ALTER TABLE public.technical_sheets DROP CONSTRAINT IF EXISTS technical_sheets_dish_id_fkey;
ALTER TABLE public.technical_sheets ADD CONSTRAINT technical_sheets_dish_id_fkey 
  FOREIGN KEY (dish_id) REFERENCES public.dishes(id) ON DELETE CASCADE;

-- stock_batches.item_id -> items.id
ALTER TABLE public.stock_batches DROP CONSTRAINT IF EXISTS stock_batches_item_id_fkey;
ALTER TABLE public.stock_batches ADD CONSTRAINT stock_batches_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

-- stock_history.item_id -> items.id
ALTER TABLE public.stock_history DROP CONSTRAINT IF EXISTS stock_history_item_id_fkey;
ALTER TABLE public.stock_history ADD CONSTRAINT stock_history_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
