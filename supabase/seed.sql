insert into program_days (id, week, date_iso)
values
  ('2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 1, '2025-10-06')
on conflict (id) do update set week = excluded.week, date_iso = excluded.date_iso;

insert into program_exercises (id, program_day_id, name, "order", target_rep_min, target_rep_max, prescribed_sets)
values
  ('f9b1f7c6-2fdf-42f6-a215-664b0e17739e', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Barbell Squat', 1, 8, 10, 4),
  ('e5372c97-3ced-4c4e-8eef-53702d293b4c', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Romanian Deadlift', 2, 10, 12, 3),
  ('c4dac8b1-8a99-43ba-9c14-7f57e5389c6b', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Leg Press', 3, 12, 15, 3)
on conflict (id) do update set
  program_day_id = excluded.program_day_id,
  name = excluded.name,
  "order" = excluded."order",
  target_rep_min = excluded.target_rep_min,
  target_rep_max = excluded.target_rep_max,
  prescribed_sets = excluded.prescribed_sets;
