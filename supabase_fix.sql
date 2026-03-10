-- RUN THIS IN YOUR SUPABASE DASHBOARD (SQL EDITOR)

-- 1. Create Storage Buckets
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Storage Policies for Memes
create policy "Public Access mem" on storage.objects for select using ( bucket_id = 'memes' );
create policy "Authenticated Upload mem" on storage.objects for insert with check ( 
  bucket_id = 'memes' and auth.role() = 'authenticated' 
);

-- 3. Storage Policies for Avatars
create policy "Public Access avatar" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Authenticated Upload avatar" on storage.objects for insert with check ( 
  bucket_id = 'avatars' and auth.role() = 'authenticated' 
);

-- 4. Fix Profiles Table RLS & Trigger
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone" on public.profiles for select using ( true );
create policy "Users can update their own profiles" on public.profiles for update using ( auth.uid() = id );
create policy "Users can insert their own profiles" on public.profiles for insert with check ( auth.uid() = id );

-- 5. Trigger to Sync Auth Metadata to Profiles Table
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    lower(new.raw_user_meta_data->>'username')
  );
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
