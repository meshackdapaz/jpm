-- ── Stories ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text,
  video_url text,
  text_content text,
  bg_color text DEFAULT '#1a1a2e',
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  view_count int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stories" ON stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Users can create their own stories" ON stories FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can delete their own stories" ON stories FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Users can update their own story view counts" ON stories FOR UPDATE USING (true);

CREATE POLICY "Anyone can view story views" ON story_views FOR SELECT USING (true);
CREATE POLICY "Users can insert their own story views" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ── Bookmarks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bookmarks" ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- ── Withdrawal Requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'mpesa',
  phone_number text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own requests" ON withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create requests" ON withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
