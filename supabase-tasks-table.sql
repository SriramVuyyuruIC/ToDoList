-- Supabase schema for TaskFlow collaboration.
-- Re-running this file is safe for existing TaskFlow databases.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  timezone text,
  theme_preference text default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists timezone text;
alter table profiles add column if not exists theme_preference text default 'dark';
alter table profiles add column if not exists updated_at timestamptz;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text default '#ef4444',
  icon text default 'Project',
  parent_project_id uuid references projects(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table projects add column if not exists color text default '#ef4444';
alter table projects add column if not exists icon text default 'Project';
alter table projects add column if not exists parent_project_id uuid references projects(id) on delete set null;
alter table projects add column if not exists archived_at timestamptz;
alter table projects add column if not exists updated_at timestamptz;

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  due_time time,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  recurring_rule text,
  tags text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table tasks add column if not exists status text not null default 'todo';
alter table tasks add column if not exists priority text not null default 'medium';
alter table tasks add column if not exists due_date date;
alter table tasks add column if not exists due_time time;
alter table tasks add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table tasks add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table tasks add column if not exists recurring_rule text;
alter table tasks add column if not exists tags text[] not null default '{}';
alter table tasks add column if not exists created_at timestamptz not null default now();
alter table tasks add column if not exists updated_at timestamptz;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_members_user_id on project_members(user_id);
create index if not exists idx_project_members_project_id on project_members(project_id);
create index if not exists idx_projects_owner_id on projects(owner_id);
create index if not exists idx_projects_parent_project_id on projects(parent_project_id);
create index if not exists idx_tasks_project_status_position on tasks(project_id, status, position);
create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_tasks_assigned_to on tasks(assigned_to);
create index if not exists idx_notifications_user_read on notifications(user_id, is_read, created_at desc);
