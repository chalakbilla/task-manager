-- Adds priority, due date, an "in_progress" status and an activity feed.

alter table tasks add column if not exists priority text not null default 'medium'
  check (priority in ('low','medium','high'));
alter table tasks add column if not exists due_date date;

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('pending','in_progress','completed'));

create table if not exists activity (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references users(id) on delete set null,
  type       text not null,          -- created | assigned | completed | email
  message    text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_created_at_idx on activity(created_at desc);
alter table activity enable row level security;
