-- Final SQL Fix for Settings Functional Logic
-- Run this in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)

-- 1. Add settings and last_seen columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Ensure RLS is enabled and policies allow reading these columns
-- (Existing policies usually cover this, but here's a refresher)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING ( true );
-- CREATE POLICY "Users can update their own profiles" ON public.profiles FOR UPDATE USING ( auth.uid() = id );
