-- Step 1: Update app_role enum to include super_admin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';