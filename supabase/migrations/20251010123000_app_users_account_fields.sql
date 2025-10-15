-- Add avatar and billing-related columns to app_users
alter table app_users
  add column if not exists avatar_url text;

alter table app_users
  add column if not exists plan_name text;

alter table app_users
  add column if not exists billing_interval text;

alter table app_users
  add column if not exists renewal_date date;

-- Backfill existing rows with baseline values
update app_users
set
  plan_name = coalesce(plan_name, 'Starter'),
  billing_interval = coalesce(billing_interval, 'monthly'),
  renewal_date = coalesce(renewal_date, current_date + interval '30 days');

-- Enforce not-null constraints and establish defaults for future inserts
alter table app_users
  alter column plan_name set default 'Starter',
  alter column plan_name set not null,
  alter column billing_interval set default 'monthly',
  alter column billing_interval set not null,
  alter column renewal_date set default ((current_date + interval '30 days')::date),
  alter column renewal_date set not null;
