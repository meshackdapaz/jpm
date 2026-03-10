-- 1. Fix Post Deletion Constraints
-- Drop existing foreign keys
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;
ALTER TABLE reposts DROP CONSTRAINT IF EXISTS reposts_post_id_fkey;

-- Re-create foreign keys with ON DELETE CASCADE
ALTER TABLE likes ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE reposts ADD CONSTRAINT reposts_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- 2. Ensure Storage Buckets and Policies Exist (Fixing Media Upload)
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Ensure public access to memes
create policy "Public Access mem"
  on storage.objects for select
  using ( bucket_id = 'memes' );

-- Ensure authenticated uploads to memes
create policy "Authenticated Upload mem"
  on storage.objects for insert
  with check ( bucket_id = 'memes' and auth.role() = 'authenticated' );

-- Ensure public access to avatars
create policy "Public Access avatar"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Ensure authenticated uploads to avatars
create policy "Authenticated Upload avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
