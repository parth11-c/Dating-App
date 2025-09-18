-- Schema for location-anchored posts with 10m uniqueness
-- Run in Supabase SQL editor

create extension if not exists cube;
create extension if not exists earthdistance;

-- Places: potential location anchors
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  title text,
  address text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Posts: one per place (we will enforce 10m uniqueness via trigger)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  image_url text not null,
  caption text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(place_id)
);

-- Visits: check-ins by users at posts
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null default 'gps', -- gps|visual
  distance_m integer,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- Reports (optional)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_places_lat on public.places using btree(lat);
create index if not exists idx_places_lng on public.places using btree(lng);
create index if not exists idx_posts_place on public.posts(place_id);
create index if not exists idx_visits_post on public.visits(post_id);
create index if not exists idx_visits_user on public.visits(user_id);

-- Function: ensure no place exists within 10 meters
create or replace function public.assert_unique_place_10m(new_lat double precision, new_lng double precision)
returns void as $$
  declare conflict_count int;
begin
  select count(*) into conflict_count
  from public.places p
  where earth_distance(ll_to_earth(p.lat, p.lng), ll_to_earth(new_lat, new_lng)) < 10;

  if conflict_count > 0 then
    raise exception 'A place already exists within 10 meters';
  end if;
end;
$$ language plpgsql security definer;

-- Trigger on places insert
create or replace function public.before_insert_places_unique_10m()
returns trigger as $$
begin
  perform public.assert_unique_place_10m(NEW.lat, NEW.lng);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_places_unique_10m on public.places;
create trigger trg_places_unique_10m
before insert on public.places
for each row execute function public.before_insert_places_unique_10m();
