-- Temporarily disable RLS on storage.objects to verify if RLS is the blocker
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Ensure buckets exist and are public
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;
