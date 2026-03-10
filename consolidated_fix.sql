-- CONSOLIDATED FIX - SAFE TO RUN MULTIPLE TIMES

-- 1. STACK TRACE / STORAGE SETUP
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Policies for Storage (Safe drop and recreate)
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for select using ( bucket_id in ('memes', 'avatars') );

drop policy if exists "Authenticated uploads" on storage.objects;
create policy "Authenticated uploads" on storage.objects for insert with check (
  auth.role() = 'authenticated' and bucket_id in ('memes', 'avatars')
);

drop policy if exists "Individual delete" on storage.objects;
create policy "Individual delete" on storage.objects for delete using (
  auth.uid() = owner and bucket_id in ('memes', 'avatars')
);

-- 2. TABLES SETUP
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  content text,
  image_url text,
  creator_id uuid references auth.users(id) on delete cascade not null,
  title text default 'Meme',
  view_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.reposts (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id),
  constraint follower_following_not_equal check (follower_id <> following_id)
);

-- 3. RLS ENABLEMENT
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reposts enable row level security;
alter table public.follows enable row level security;

-- 4. POLICIES (Safe drop and recreate)
drop policy if exists "Allow public select" on public.posts;
create policy "Allow public select" on public.posts for select using (true);
drop policy if exists "Allow auth insert" on public.posts;
create policy "Allow auth insert" on public.posts for insert with check (auth.uid() = creator_id);

drop policy if exists "Comments are viewable by everyone" on public.comments;
create policy "Comments are viewable by everyone" on public.comments for select using (true);
drop policy if exists "Users can post comments" on public.comments;
create policy "Users can post comments" on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "Reposts are viewable by everyone" on public.reposts;
create policy "Reposts are viewable by everyone" on public.reposts for select using (true);
drop policy if exists "Users can repost" on public.reposts;
create policy "Users can repost" on public.reposts for insert with check (auth.uid() = user_id);

drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone" on public.follows for select using (true);
drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- 5. RPC FUNCTIONS
create or replace function increment_view_count(post_id uuid)
returns void as $$
begin
  update public.posts
  set view_count = view_count + 1
  where id = post_id;
end;
$$ language plpgsql security definer;

-- 6. REALTIME (Robust Check)
DO $$
DECLARE
  tables_to_add text[] := ARRAY['posts', 'comments', 'reposts', 'follows', 'likes'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables_to_add
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
