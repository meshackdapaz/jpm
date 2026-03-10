-- RUN THIS IN YOUR SUPABASE DASHBOARD (SQL EDITOR)

-- 1. Ensure Storage Buckets are Public and have Policies
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Allow public read access
create policy "Public Access" on storage.objects for select using ( bucket_id in ('memes', 'avatars') );

-- Allow authenticated uploads
create policy "Authenticated uploads" on storage.objects for insert with check (
  auth.role() = 'authenticated' and bucket_id in ('memes', 'avatars')
);

-- Allow users to delete their own objects
create policy "Individual delete" on storage.objects for delete using (
  auth.uid() = owner and bucket_id in ('memes', 'avatars')
);

-- 2. Verify Comments Table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;
create policy "Comments are viewable by everyone" on public.comments for select using ( true );
create policy "Users can post comments" on public.comments for insert with check ( auth.uid() = user_id );
create policy "Users can delete their own comments" on public.comments for delete using ( auth.uid() = user_id );

-- Enable Realtime for comments (Robust Check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add table to publication: %', SQLERRM;
END $$;
