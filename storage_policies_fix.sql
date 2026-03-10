-- 1. Ensure Storage Buckets Exist and are Public
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2. Ensure RLS is enabled on objects
alter table storage.objects enable row level security;

-- 3. Drop existing policies to avoid duplicates and re-create them cleanly
drop policy if exists "Meme images are publicly accessible." on storage.objects;
drop policy if exists "Authenticated users can upload meme images." on storage.objects;
drop policy if exists "Public Access mem" on storage.objects;
drop policy if exists "Authenticated Upload mem" on storage.objects;
drop policy if exists "Public Access avatar" on storage.objects;
drop policy if exists "Authenticated Upload avatar" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated uploads" on storage.objects;
drop policy if exists "Individual delete" on storage.objects;

-- 4. Recreate precise policies for Public Read and Authenticated Insert/Delete
create policy "Public Access mem" on storage.objects for select using ( bucket_id = 'memes' );
create policy "Authenticated Upload mem" on storage.objects for insert with check ( bucket_id = 'memes' and auth.role() = 'authenticated' );
create policy "Public Access avatar" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Authenticated Upload avatar" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
create policy "Individual delete mem" on storage.objects for delete using ( auth.uid() = owner and bucket_id = 'memes' );
create policy "Individual delete avatar" on storage.objects for delete using ( auth.uid() = owner and bucket_id = 'avatars' );
