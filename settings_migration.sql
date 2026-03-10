-- Add settings JSONB column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Ensure the column is viewable and updatable by the user
-- (Handled by existing RLS policies on profiles)
