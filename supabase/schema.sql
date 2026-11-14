-- My Library — Supabase schema
-- Run this once in the Supabase SQL editor (or with `supabase db push`).
-- Then run supabase/seed.sql.
--
-- Security model
--   read:  anyone (the public shelf is read-only)
--   write: only signed-in accounts (turn signups off, then create your one user)
--   files: public bucket, authenticated writes only

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ --
--  Items                                                              --
-- ------------------------------------------------------------------ --

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(btrim(title)) > 0),
  author      text not null default '',
  type        text not null default 'book'
              check (type in ('book', 'article', 'pdf', 'video', 'note')),
  category    text not null default 'Unsorted',
  tags        text[] not null default '{}'::text[],
  cover_color text,
  note        text,
  url         text,
  file_path   text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists items_category_position_idx
  on public.items (category, position, created_at);

-- Keep updated_at honest without relying on the client.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ --
--  Row level security                                                 --
-- ------------------------------------------------------------------ --

alter table public.items enable row level security;

drop policy if exists "Items are publicly readable" on public.items;
create policy "Items are publicly readable"
  on public.items
  for select
  using (true);

drop policy if exists "Signed-in owners can add items" on public.items;
create policy "Signed-in owners can add items"
  on public.items
  for insert
  to authenticated
  with check (true);

drop policy if exists "Signed-in owners can edit items" on public.items;
create policy "Signed-in owners can edit items"
  on public.items
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Signed-in owners can remove items" on public.items;
create policy "Signed-in owners can remove items"
  on public.items
  for delete
  to authenticated
  using (true);

grant select on public.items to anon, authenticated;
grant insert, update, delete on public.items to authenticated;

-- ------------------------------------------------------------------ --
--  Storage bucket                                                     --
-- ------------------------------------------------------------------ --

insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do update set public = true;

drop policy if exists "Library files are publicly readable" on storage.objects;
create policy "Library files are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'library');

drop policy if exists "Signed-in owners can upload library files" on storage.objects;
create policy "Signed-in owners can upload library files"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'library');

drop policy if exists "Signed-in owners can update library files" on storage.objects;
create policy "Signed-in owners can update library files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'library')
  with check (bucket_id = 'library');

drop policy if exists "Signed-in owners can delete library files" on storage.objects;
create policy "Signed-in owners can delete library files"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'library');
