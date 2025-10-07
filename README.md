# Workout Plan Companion

A full front-end prototype that turns the `Log Book (1).xlsx` training log into an eight-week strength programme. Athletes can create an account with a username and password, review their weekly sessions, capture set-by-set notes, and watch their completion stats update. Coaches get a dedicated admin dashboard that surfaces every athlete’s progress in one place.

## Highlights
- **Workbook-derived plan** – the Excel log is parsed into `src/data/generatedPlan.ts`, capturing sessions, set prescriptions, and coach notes for eight weeks (Mon/Tue/Wed/Fri/Sat split).
- **Username-based auth** – salted SHA-256 password hashing on the client with automatic seeding of a coach account (`admin` / `admin123`).
- **Athlete dashboard** – week selector, completion metrics, and quick links into each session. Every exercise card shows the coach prescription and lets the athlete record their own loads and comments.
- **Workout logging flow** – save individual exercises or autofill the entire session from the coach plan. Progress persists in `localStorage`, so reloads keep the log intact.
- **Admin view** – sortable table of all registered users (athletes + coaches) with completion totals and last-activity timestamps, plus per-week status breakdowns.
- **Supabase sync** – when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present, accounts and workout logs are stored in Supabase (`app_users`, `session_progress`) so every device sees the latest state. Without those variables the app falls back to local storage for offline testing.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app:
   ```bash
   npm run dev
   ```
   Open the printed localhost URL.
3. (Optional) Apply the Supabase schema for shared storage:
   ```bash
   npm run db:push
   ```
   This migration adds the `app_users` and `session_progress` tables used for auth + logging sync.
4. Build for production (type check included):
   ```bash
   npm run build
   ```

All state lives in the browser unless Supabase credentials are supplied. To completely reset users and logs in local mode, clear site data or call `clearAllStorage()` from `src/lib/storage` in the console.

## Supabase Setup
1. Add the environment variables (for both dev and build):
   ```bash
   export VITE_SUPABASE_URL=...
   export VITE_SUPABASE_ANON_KEY=...
   ```
2. Ensure the database has the latest migration:
   ```bash
   npm run db:push
   ```
3. Start the app (`npm run dev`). The first launch seeds the `app_users` table with the default coach account if it does not already exist.

Tables created by the migration:
- `app_users` – stores usernames, salted password hashes, and admin flags.
- `session_progress` – one row per athlete/exercise/week/session tracking sets, notes, and last-updated timestamps.

## Key Files
- `example data/Log Book (1).xlsx` – source workbook used to generate the programme.
- `src/data/generatedPlan.ts` – typed representation of the coach plan (auto-generated from the workbook).
- `src/context/` – React contexts for plan data, authentication, and progress tracking.
- `src/features/auth/AuthScreen.tsx` – signup / login UI.
- `src/features/dashboard/UserDashboard.tsx` – athlete weekly overview.
- `src/features/workout/WorkoutSessionView.tsx` – per-session logging flow.
- `src/features/admin/AdminDashboard.tsx` – coach-facing progress dashboard.

## Default Accounts
- Coach / admin: `admin` with password `admin123` (created automatically on first load).
- Newly created users start with empty logs but appear immediately in the admin dashboard.

## Data & Security Notes
- Passwords are salted and hashed client-side before storage; however, this is a demo and not a replacement for a production auth stack.
- With Supabase configured, user credentials and workout progress persist in the hosted Postgres database. Without it, everything is stored locally under the `workout-app/*` keys.
- Clearing storage (manually or via the helper mentioned above) wipes accounts and progress in local-only mode.

## Next Steps
- Expose progression analytics such as estimated 1RM trends from the logged sets.
- Add CSV export to recreate the original log book with athlete updates baked in.
