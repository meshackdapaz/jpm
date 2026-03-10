-- FIX USER DELETION AND CASCADING CONSTRAINTS
-- Run this in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)

-- 1. Ensure public.profiles cascades when auth.users is deleted
ALTER TABLE IF EXISTS public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Ensure public.posts cascades when auth.users is deleted
ALTER TABLE IF EXISTS public.posts
  DROP CONSTRAINT IF EXISTS posts_creator_id_fkey,
  ADD CONSTRAINT posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Ensure public.comments cascades when auth.users is deleted
ALTER TABLE IF EXISTS public.comments
  DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
  ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Ensure public.follows cascades when auth.users is deleted
ALTER TABLE IF EXISTS public.follows
  DROP CONSTRAINT IF EXISTS follows_follower_id_fkey,
  ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS follows_following_id_fkey,
  ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Ensure public.likes cascades when auth.users is deleted
ALTER TABLE IF EXISTS public.likes
  DROP CONSTRAINT IF EXISTS likes_user_id_fkey,
  ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Ensure public.reposts cascades when auth.users is deleted
ALTER TABLE IF EXISTS public.reposts
  DROP CONSTRAINT IF EXISTS reposts_user_id_fkey,
  ADD CONSTRAINT reposts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Ensure public.notifications cascades when auth.users is deleted
ALTER TABLE IF EXISTS public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey,
  ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. Create a robust Admin User Deletion RPC (Security Definer)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- We delete from auth.users, and because we set up cascades above,
  -- everything in the public schema will follow automatically.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
