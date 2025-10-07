create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  salt text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists session_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  week_index integer not null,
  session_id text not null,
  exercise_id text not null,
  completed_sets integer not null,
  total_sets integer not null,
  set_entries text[] not null default '{}',
  notes text,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists session_progress_unique_idx on session_progress(user_id, week_index, session_id, exercise_id);
create index if not exists session_progress_user_idx on session_progress(user_id);
