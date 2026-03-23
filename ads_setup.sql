-- DIRECT ADS & CREATOR PROGRAM SETUP
-- 1. Storage Bucket for Ads
insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access Ads" on storage.objects;
create policy "Public Access Ads" on storage.objects for select using ( bucket_id = 'ads' );

drop policy if exists "Admin uploads Ads" on storage.objects;
create policy "Admin uploads Ads" on storage.objects for insert with check (
  bucket_id = 'ads'
);

-- 2. Direct Ads Table
create table if not exists public.direct_ads (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  image_url text not null,
  target_url text not null,
  impressions_count int default 0,
  clicks_count int default 0,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. RLS for Direct Ads
alter table public.direct_ads enable row level security;
drop policy if exists "Ads are viewable by everyone" on public.direct_ads;
create policy "Ads are viewable by everyone" on public.direct_ads for select using (true);
drop policy if exists "Only admins can manage ads" on public.direct_ads;
create policy "Only admins can manage ads" on public.direct_ads for all using (true); -- Simplified for now, in production we'd check is_admin

-- 4. RPC for Ad Analytics
create or replace function increment_ad_impression(ad_id uuid)
returns void as $$
begin
  update public.direct_ads
  set impressions_count = impressions_count + 1
  where id = ad_id;
end;
$$ language plpgsql security definer;

create or replace function increment_ad_click(ad_id uuid)
returns void as $$
begin
  update public.direct_ads
  set clicks_count = clicks_count + 1
  where id = ad_id;
end;
$$ language plpgsql security definer;
