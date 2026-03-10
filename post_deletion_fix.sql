-- 1. Add DELETE policy for posts
-- This allows users to delete only their own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts
FOR DELETE USING (auth.uid() = creator_id);

-- 2. Ensure creator_id is correct in handle
-- Some older logic might have used user_id or creator_id, checking consistency.
-- In consolidated_fix.sql: creator_id uuid references auth.users(id)
