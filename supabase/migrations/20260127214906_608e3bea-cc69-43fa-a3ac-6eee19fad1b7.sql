-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS policies for suppliers
CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage suppliers"
ON public.suppliers FOR ALL
USING (is_admin(auth.uid()));

-- Add supplier_id to items table
ALTER TABLE public.items 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Create dishes table (pratos)
CREATE TABLE public.dishes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on dishes
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

-- RLS policies for dishes
CREATE POLICY "Authenticated users can view dishes"
ON public.dishes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage dishes"
ON public.dishes FOR ALL
USING (is_admin(auth.uid()));

-- Create technical_sheets table (fichas_tecnicas)
CREATE TABLE public.technical_sheets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    quantity_per_sale NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(dish_id, item_id)
);

-- Enable RLS on technical_sheets
ALTER TABLE public.technical_sheets ENABLE ROW LEVEL SECURITY;

-- RLS policies for technical_sheets
CREATE POLICY "Authenticated users can view technical sheets"
ON public.technical_sheets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage technical sheets"
ON public.technical_sheets FOR ALL
USING (is_admin(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dishes_updated_at
BEFORE UPDATE ON public.dishes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_sheets_updated_at
BEFORE UPDATE ON public.technical_sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();