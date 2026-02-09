-- Add whatsapp field to profiles table
ALTER TABLE public.profiles
ADD COLUMN whatsapp text;

-- Add direct_sale and price fields to items table for direct sale functionality
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS direct_sale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;