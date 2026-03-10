-- RUN THIS IN YOUR SUPABASE DASHBOARD (SQL EDITOR)

-- 1. Create Follows Table
create table if not exists public.follows (
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id),
  constraint follower_following_not_equal check (follower_id <> following_id)
);

-- 2. Enable RLS
alter table public.follows enable row level security;

-- 3. RLS Policies
create policy "Follows are viewable by everyone" on public.follows for select using ( true );
create policy "Users can follow others" on public.follows for insert with check ( auth.uid() = follower_id );
create policy "Users can unfollow" on public.follows for delete culinary ( auth.uid() = follower_id );

-- 4. Enable Realtime
alter publication supabase_realtime add table public.follows;

-- 5. Optional: Add function to get follower counts easily if needed
-- But we can just use .select('*', { count: 'exact' }) in the SDK
