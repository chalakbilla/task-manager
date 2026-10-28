-- Run in Supabase: SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  google_id     text not null unique,
  email         text not null unique,
  name          text not null,
  picture       text,
  refresh_token text,              -- used to send Gmail on this user's behalf
  created_at    timestamptz not null default now()
);

create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       text not null default 'pending' check (status in ('pending','completed')),
  created_by   uuid not null,
  assigned_to  uuid not null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  constraint tasks_created_by_fkey  foreign key (created_by)  references users(id) on delete cascade,
  constraint tasks_assigned_to_fkey foreign key (assigned_to) references users(id) on delete cascade
);

create index if not exists tasks_assigned_to_idx on tasks(assigned_to);
create index if not exists tasks_created_by_idx  on tasks(created_by);

-- Only the Flask backend (service_role key) touches the DB. RLS on with no
-- policies means the public anon key can read/write nothing.
alter table users enable row level security;
alter table tasks enable row level security;
