drop policy if exists "Users can un-repost" on public.reposts;
create policy "Users can un-repost" on public.reposts for delete using (auth.uid() = user_id);
