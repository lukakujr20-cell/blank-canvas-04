
-- Add unit column to technical_sheets to persist which unit level was chosen for the ingredient
ALTER TABLE public.technical_sheets
ADD COLUMN unit text DEFAULT NULL;

COMMENT ON COLUMN public.technical_sheets.unit IS 'The specific unit chosen for this ingredient (purchase, consumption, or recipe unit from the item)';
