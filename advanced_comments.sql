-- 1. Add parent_id for nested replies
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- 2. Create comment_likes table for like/dislike functionality
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    is_like BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- 3. Set up RLS for comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select comment_likes" ON comment_likes;
DROP POLICY IF EXISTS "Auth insert comment_likes" ON comment_likes;
DROP POLICY IF EXISTS "Auth update comment_likes" ON comment_likes;
DROP POLICY IF EXISTS "Auth delete comment_likes" ON comment_likes;

CREATE POLICY "Public select comment_likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Auth insert comment_likes" ON comment_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update comment_likes" ON comment_likes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Auth delete comment_likes" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Ensure Realtime is enabled for comment_likes
alter publication supabase_realtime add table comment_likes;
