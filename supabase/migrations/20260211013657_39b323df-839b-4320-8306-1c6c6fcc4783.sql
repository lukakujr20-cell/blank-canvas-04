
-- Add sub-unit and recipe-unit conversion fields to items table
ALTER TABLE public.items 
  ADD COLUMN sub_unit text DEFAULT NULL,
  ADD COLUMN recipe_unit text DEFAULT NULL,
  ADD COLUMN recipe_units_per_consumption numeric DEFAULT NULL;

-- sub_unit: the consumption unit name (e.g., "un" for queijo when buying by caixa)
-- recipe_unit: optional 3rd level unit (e.g., "fatia", "g")
-- recipe_units_per_consumption: how many recipe units per 1 consumption unit (e.g., 1 queijo = 20 fatias)
COMMENT ON COLUMN public.items.sub_unit IS 'Consumption sub-unit name (e.g., un, kg, fatia)';
COMMENT ON COLUMN public.items.recipe_unit IS 'Recipe measurement unit (optional 3rd level, e.g., fatia, g)';
COMMENT ON COLUMN public.items.recipe_units_per_consumption IS 'How many recipe units per 1 consumption unit';
