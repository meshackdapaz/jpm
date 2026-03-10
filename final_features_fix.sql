-- RUN THIS IN YOUR SUPABASE DASHBOARD (SQL EDITOR)

-- 1. Fix Follows Table (if not working)
drop table if exists public.follows;
create table public.follows (
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id),
  constraint follower_following_not_equal check (follower_id <> following_id)
);

alter table public.follows enable row level security;
create policy "Follows are viewable by everyone" on public.follows for select using ( true );
create policy "Users can follow others" on public.follows for insert with check ( auth.uid() = follower_id );
create policy "Users can unfollow" on public.follows for delete using ( auth.uid() = follower_id );

-- 2. Create Reposts Table
create table if not exists public.reposts (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

alter table public.reposts enable row level security;
create policy "Reposts are viewable by everyone" on public.reposts for select using ( true );
create policy "Users can repost" on public.reposts for insert with check ( auth.uid() = user_id );
create policy "Users can remove repost" on public.reposts for delete using ( auth.uid() = user_id );

-- 3. Add Views (Analytics) to Posts
alter table public.posts add column if not exists view_count int default 0;

create or replace function increment_view_count(post_id uuid)
returns void as $$
begin
  update public.posts
  set view_count = view_count + 1
  where id = post_id;
end;
$$ language plpgsql security definer;

-- 4. Enable Realtime for new tables
begin;
  -- Remove if already exists to avoid errors
  -- alter publication supabase_realtime drop table public.reposts; 
  alter publication supabase_realtime add table public.reposts;
  alter publication supabase_realtime add table public.follows;
commit;
