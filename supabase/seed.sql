

-- Create sample profiles (these would normally be created by Supabase Auth)
-- Note: In production, these would be managed by Supabase Auth

-- Insert program days
INSERT INTO program_days (id, week, date_iso, created_at)
VALUES
  ('2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 1, '2025-10-08', NOW()),
  ('3c4ccf9c-5c3f-5b77-93ef-2d3509af2d51', 1, '2025-10-09', NOW()),
  ('4d5ddf9d-6d4f-6c88-a4f0-3e4610bf3e52', 1, '2025-10-10', NOW())
ON CONFLICT (id) DO UPDATE SET 
  week = excluded.week, 
  date_iso = excluded.date_iso;

-- Insert program exercises
INSERT INTO program_exercises (id, program_day_id, name, "order", target_rep_min, target_rep_max, prescribed_sets)
VALUES
  ('f9b1f7c6-2fdf-42f6-a215-664b0e17739e', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Barbell Squat', 1, 8, 10, 4),
  ('e5372c97-3ced-4c4e-8eef-53702d293b4c', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Romanian Deadlift', 2, 10, 12, 3),
  ('c4dac8b1-8a99-43ba-9c14-7f57e5389c6b', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Leg Press', 3, 12, 15, 3),
  ('a6c2a8d7-3aef-53a7-b326-775c1f28850f', '3c4ccf9c-5c3f-5b77-93ef-2d3509af2d51', 'Bench Press', 1, 6, 8, 4),
  ('b7d3a9e8-4aff-64a8-c437-886d2a39951a', '3c4ccf9c-5c3f-5b77-93ef-2d3509af2d51', 'Incline Dumbbell Press', 2, 8, 10, 3),
  ('c8e4a0f9-5aff-75a9-d548-997e3a40a62a', '3c4ccf9c-5c3f-5b77-93ef-2d3509af2d51', 'Tricep Dips', 3, 10, 12, 3)
ON CONFLICT (id) DO UPDATE SET
  program_day_id = excluded.program_day_id,
  name = excluded.name,
  "order" = excluded."order",
  target_rep_min = excluded.target_rep_min,
  target_rep_max = excluded.target_rep_max,
  prescribed_sets = excluded.prescribed_sets;
