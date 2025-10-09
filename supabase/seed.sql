-- Insert subscription products
INSERT INTO subscription_products (id, name, description, price, currency, billing_period, includes_challenge_access)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Basic Plan', 'Essential coaching with 3 workouts per week', 2499.00, 'INR', 'monthly', false),
  ('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Premium Plan', 'Full coaching with challenges access', 4999.00, 'INR', 'monthly', true),
  ('c3d4e5f6-g7h8-9012-cdef-345678901234', 'Elite Plan', 'Premium plan with 1-on-1 coaching', 7999.00, 'INR', 'monthly', true)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  currency = excluded.currency,
  billing_period = excluded.billing_period,
  includes_challenge_access = excluded.includes_challenge_access;

-- Insert challenge programs
INSERT INTO challenge_programs (id, name, duration_weeks, focus, summary, outcomes, unlock_cost, currency, difficulty)
VALUES
  ('ch1-2345-6789-abcd-ef1234567890', '30-Day Strength Builder', 4, ARRAY['strength', 'muscle'], 'Build foundational strength', ARRAY['Increase max lifts', 'Better form'], 999.00, 'INR', 'foundation'),
  ('ch2-3456-789a-bcde-f234567890ab', 'Advanced Powerlifting', 8, ARRAY['powerlifting', 'competition'], 'Competition preparation', ARRAY['PR in big 3', 'Competition ready'], 1999.00, 'INR', 'advanced')
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  duration_weeks = excluded.duration_weeks,
  focus = excluded.focus,
  summary = excluded.summary,
  outcomes = excluded.outcomes,
  unlock_cost = excluded.unlock_cost,
  currency = excluded.currency,
  difficulty = excluded.difficulty;

-- Insert workout templates
INSERT INTO workout_templates (id, name, description, duration_weeks, split_name, category_breakdown, recommended_for, template_data)
VALUES
  ('wt1-2345-6789-abcd-ef1234567890', 'Push/Pull/Legs', 'Classic 3-day split for muscle building', 12, 'PPL', ARRAY['push', 'pull', 'legs'], ARRAY['Intermediate lifters', 'Muscle building'], '{"days": [{"title": "Push Day", "exercises": ["Bench Press", "Shoulder Press", "Tricep Dips"]}]}'),
  ('wt2-3456-789a-bcde-f234567890ab', 'Full Body Strength', 'Compound movement focused program', 8, 'Full Body', ARRAY['full-body'], ARRAY['Beginners', 'Strength building'], '{"days": [{"title": "Full Body", "exercises": ["Squat", "Deadlift", "Bench Press"]}]}')
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  duration_weeks = excluded.duration_weeks,
  split_name = excluded.split_name,
  category_breakdown = excluded.category_breakdown,
  recommended_for = excluded.recommended_for,
  template_data = excluded.template_data;

-- Create sample profiles (these would normally be created by Supabase Auth)
-- Note: In production, these would be managed by Supabase Auth

-- Insert program days
INSERT INTO program_days (id, week, date_iso, created_at)
VALUES
  ('2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 1, '2025-10-08', NOW()),
  ('3c4ccf9c-5c3f-5b77-93ef-2d3509gf2d51', 1, '2025-10-09', NOW()),
  ('4d5ddf9d-6d4f-6c88-a4f0-3e4610hg3e52', 1, '2025-10-10', NOW())
ON CONFLICT (id) DO UPDATE SET 
  week = excluded.week, 
  date_iso = excluded.date_iso;

-- Insert program exercises
INSERT INTO program_exercises (id, program_day_id, name, exercise_order, target_rep_min, target_rep_max, prescribed_sets)
VALUES
  ('f9b1f7c6-2fdf-42f6-a215-664b0e17739e', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Barbell Squat', 1, 8, 10, 4),
  ('e5372c97-3ced-4c4e-8eef-53702d293b4c', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Romanian Deadlift', 2, 10, 12, 3),
  ('c4dac8b1-8a99-43ba-9c14-7f57e5389c6b', '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50', 'Leg Press', 3, 12, 15, 3),
  ('g6c2g8d7-3geg-53g7-b326-775c1f28850f', '3c4ccf9c-5c3f-5b77-93ef-2d3509gf2d51', 'Bench Press', 1, 6, 8, 4),
  ('h7d3h9e8-4hfh-64h8-c437-886d2g39951g', '3c4ccf9c-5c3f-5b77-93ef-2d3509gf2d51', 'Incline Dumbbell Press', 2, 8, 10, 3),
  ('i8e4i0f9-5igi-75i9-d548-997e3h40a62h', '3c4ccf9c-5c3f-5b77-93ef-2d3509gf2d51', 'Tricep Dips', 3, 10, 12, 3)
ON CONFLICT (id) DO UPDATE SET
  program_day_id = excluded.program_day_id,
  name = excluded.name,
  exercise_order = excluded.exercise_order,
  target_rep_min = excluded.target_rep_min,
  target_rep_max = excluded.target_rep_max,
  prescribed_sets = excluded.prescribed_sets;
