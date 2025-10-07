-- Program days store the schedule per calendar date
create table if not exists program_days (
  id uuid primary key default gen_random_uuid(),
  week integer not null,
  date_iso date not null unique,
  created_at timestamptz not null default now()
);

-- Exercises scheduled within a program day
create table if not exists program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  name text not null,
  "order" integer not null,
  target_rep_min integer not null,
  target_rep_max integer not null,
  prescribed_sets integer not null,
  created_at timestamptz not null default now()
);

create index if not exists program_exercises_day_order_idx on program_exercises(program_day_id, "order");

-- Exercise level logs track gamification points and completion state
create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  program_exercise_id uuid not null references program_exercises(id) on delete cascade,
  completed_sets integer not null default 0,
  all_sets_complete boolean not null default false,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  left_exercise_view_at timestamptz
);

create unique index if not exists exercise_logs_unique_exercise_idx on exercise_logs(program_day_id, program_exercise_id);

-- Individual set entries per save
create table if not exists set_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_log_id uuid not null references exercise_logs(id) on delete cascade,
  program_exercise_id uuid not null references program_exercises(id) on delete cascade,
  set_index integer not null,
  reps integer not null,
  weight numeric(6,2) not null,
  comment text,
  exceeded_range boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists set_logs_unique_idx on set_logs(program_exercise_id, set_index);
create index if not exists set_logs_exercise_idx on set_logs(program_exercise_id);

-- Ensure weight is positive but allow bodyweight entries (zero)
alter table set_logs add constraint set_logs_weight_positive check (weight >= 0);

-- Ensure rep ranges are positive
alter table program_exercises add constraint program_exercises_rep_range check (target_rep_min > 0 and target_rep_max >= target_rep_min);

-- Ensure prescribed sets is positive
alter table program_exercises add constraint program_exercises_sets_positive check (prescribed_sets > 0);
