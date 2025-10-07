-- Enable row level security on application tables and create basic policies
alter table if exists app_users enable row level security;
alter table if exists session_progress enable row level security;

-- Policies for app_users
drop policy if exists app_users_select_all on app_users;
create policy app_users_select_all on app_users
  for select
  to anon
  using (true);

drop policy if exists app_users_insert_self on app_users;
create policy app_users_insert_self on app_users
  for insert
  to anon
  with check (true);

-- Policies for session_progress
drop policy if exists session_progress_select_all on session_progress;
create policy session_progress_select_all on session_progress
  for select
  to anon
  using (true);

drop policy if exists session_progress_upsert on session_progress;
create policy session_progress_upsert on session_progress
  for all
  to anon
  using (true)
  with check (true);

-- Ensure realtime publication picks up the tables for websocket updates
alter publication supabase_realtime add table app_users;
alter publication supabase_realtime add table session_progress;
