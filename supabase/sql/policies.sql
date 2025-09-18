-- Enable RLS and add basic policies

alter table public.places enable row level security;
alter table public.posts enable row level security;
alter table public.visits enable row level security;
alter table public.reports enable row level security;

-- Authenticated users can read everything for MVP
create policy if not exists "read_all_places" on public.places for select to authenticated using (true);
create policy if not exists "read_all_posts" on public.posts for select to authenticated using (true);
create policy if not exists "read_all_visits" on public.visits for select to authenticated using (true);
create policy if not exists "read_all_reports" on public.reports for select to authenticated using (true);

-- Insert/Update only by owner
create policy if not exists "insert_places" on public.places for insert to authenticated with check (auth.uid() = created_by);
create policy if not exists "insert_posts" on public.posts for insert to authenticated with check (auth.uid() = created_by);
create policy if not exists "insert_visits" on public.visits for insert to authenticated with check (auth.uid() = user_id);
create policy if not exists "insert_reports" on public.reports for insert to authenticated with check (auth.uid() = user_id);

create policy if not exists "update_own_posts" on public.posts for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy if not exists "update_own_places" on public.places for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Delete own content
create policy if not exists "delete_own_posts" on public.posts for delete to authenticated using (auth.uid() = created_by);
create policy if not exists "delete_own_places" on public.places for delete to authenticated using (auth.uid() = created_by);
