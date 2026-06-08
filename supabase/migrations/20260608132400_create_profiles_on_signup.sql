-- Create and maintain public.profiles rows for every Supabase Auth user.
-- Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  timezone text,
  theme_preference text default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists theme_preference text default 'dark';
alter table public.profiles add column if not exists updated_at timestamptz;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1),
      'TaskFlow User'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (
  id,
  email,
  display_name,
  avatar_url,
  created_at,
  updated_at
)
select
  users.id,
  users.email,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'display_name', ''),
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    split_part(users.email, '@', 1),
    'TaskFlow User'
  ),
  coalesce(
    nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(users.raw_user_meta_data ->> 'picture', '')
  ),
  coalesce(users.created_at, now()),
  now()
from auth.users as users
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      updated_at = now();

do $$
begin
  if to_regclass('public.project_members') is not null then
    alter table public.project_members
      drop constraint if exists project_members_user_id_fkey;

    alter table public.project_members
      add constraint project_members_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end;
$$;
