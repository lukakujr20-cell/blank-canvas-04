
-- Fix orphaned pos_categories (created by super_admin without restaurant_id)
UPDATE public.pos_categories 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;

-- Fix orphaned dishes
UPDATE public.dishes 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;

-- Fix orphaned items
UPDATE public.items 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;

-- Fix orphaned categories
UPDATE public.categories 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;

-- Fix orphaned orders
UPDATE public.orders 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;

-- Fix orphaned stock_batches
UPDATE public.stock_batches 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;

-- Fix orphaned suppliers
UPDATE public.suppliers 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;

-- Fix orphaned restaurant_tables
UPDATE public.restaurant_tables 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE restaurant_id IS NULL;
