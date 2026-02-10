-- Fix the staff user profile that is missing restaurant_id
UPDATE public.profiles 
SET restaurant_id = 'b2e41280-c48e-4e2c-999b-42a4f11fd7e6' 
WHERE id = '113f6bfa-64d7-4d8a-af06-7fa43f91401c' 
AND restaurant_id IS NULL;