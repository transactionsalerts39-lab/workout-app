## Relevant Files

- `src/features/admin/AdminDashboard.tsx` - ✅ Extended trainer workspace with intake, scheduling, and accountability surfaces.
- `src/features/admin/components/IntakeForm.tsx` - ✅ Intake workflow component capturing profile, goals, background, and availability with validation.
- `src/features/admin/components/SchedulingConsole.tsx` - ✅ NEW: Calendar and list view for client session management.
- `src/features/admin/components/RemindersSystem.tsx` - ✅ NEW: Automated reminder rules and communication history.
- `src/features/admin/components/ClientMessaging.tsx` - ✅ NEW: Trainer-client messaging thread system.
- `src/features/admin/components/ComplianceDashboard.tsx` - ✅ NEW: Check-in compliance metrics and client monitoring dashboard.
- `src/features/dashboard/components/ScheduleUpdates.tsx` - ✅ NEW: Schedule snapshots for athlete dashboard.
- `src/features/dashboard/components/AthleteMessaging.tsx` - ✅ NEW: Athlete-facing messaging thread in UserDashboard.
- `src/features/admin/AdminSettingsPanel.tsx` - Reference for reusing admin form/layout patterns when building new panels.
- `src/features/dashboard/UserDashboard.tsx` - Surface accountability reminders and client messaging for athletes.
- `src/features/dashboard/components/HomeScreen.tsx` - Potential location for new summary widgets tied to scheduling and check-ins.
- `src/context/ProgramContext.tsx` - ✅ Updated client data structures, scheduling logic, reminder helpers, and persistence hooks.
- `src/context/ProgressContext.tsx` - Derive missed check-ins, integrate reminder status, and sync progress updates.
- `src/context/AuthContext.tsx` - Ensure trainer-facing features respect auth roles and expose new client metadata.
- `src/types/program.ts` - ✅ Define new types for intake details, scheduling entries, reminders, and messaging threads.
- `src/lib/supabaseRepository.ts` - ✅ Database integration for client operations.
- `src/types/plan.ts` - Reference existing session/plan types for linking schedule entries to workouts.
- `supabase/migrations` - Add tables/functions for client intake, scheduling events, automated reminders, and messaging logs.
- `supabase/seed.sql` (or equivalent) - Seed sample data for testing intake/scheduling flows.
- `src/context/__tests__/ProgramContext.test.tsx` - Add/adjust tests covering new client data mutations.
- `src/context/__tests__/ProgressContext.test.tsx` - Verify reminder and compliance calculations.
- `src/features/admin/__tests__/AdminDashboard.test.tsx` - Cover new UI states and interactions.

### Notes

- Place new or updated tests alongside the modules they exercise (e.g., `ProgramContext.test.tsx`).
- Run `npm run test` to execute the Vitest suite covering updated contexts and components.

## Tasks

- [x] 1.0 Build client intake workflow and onboarding screens
  - [x] 1.1 Audit existing admin/user forms to identify reusable primitives for intake fields.
  - [x] 1.2 Design and scaffold a dedicated intake panel within the admin dashboard, including navigation entry points.
  - [x] 1.3 Implement intake form sections (profile, goals, equipment, availability) with validation using existing UI components.
  - [x] 1.4 Persist submitted intake data through `ProgramContext` using Supabase when available and local storage fallback otherwise.

- [x] 2.0 Extend client/program data models with Supabase-backed persistence
  - [x] 2.1 Update `types/program.ts` and related contexts to store intake metadata, schedule preferences, and reminder settings.
  - [x] 2.2 Add Supabase schema changes (tables/functions) for client intake records, scheduling events, and messaging threads, plus seeds.
  - [x] 2.3 Enhance `ProgramContext` loaders/savers to merge remote data with local defaults and expose helper selectors.

- [x] 3.0 Implement trainer scheduling console with session management actions
  - [x] 3.1 Create calendar/list components within `AdminDashboard` for viewing client sessions tied to `PlanContext` workouts.
  - [x] 3.2 Wire actions to confirm, reschedule, and cancel sessions, updating Supabase records and local state with change history.
  - [ ] 3.3 Surface schedule snapshots to the athlete dashboard so clients see updated plans and notifications.

- [x] 4.0 Deliver accountability automation for reminders and check-in visibility
  - [x] 4.1 Derive check-in compliance metrics in `ProgressContext`, flagging missed or late entries per client.
  - [x] 4.2 Build reminder triggers (Supabase functions or client-side schedulers) for upcoming sessions and overdue check-ins.
  - [x] 4.3 Display accountability widgets in trainer and athlete dashboards with quick reminder actions.

- [x] 5.0 Add client-specific messaging thread and responsive/mobile polish
  - [x] 5.1 Define messaging entities in Supabase/schema and extend contexts for read/write operations.
  - [x] 5.2 Implement trainer ↔ client message thread UI within admin and user dashboards, reusing existing chat patterns.
  - [x] 5.3 Audit new panels for responsive behaviour, ensuring mobile layouts match established Tailwind conventions.

- [x] 6.0 Surface schedule snapshots to athlete dashboard so clients see updated plans and notifications
  - [x] 6.1 Create schedule update components for athlete dashboard 
  - [x] 6.2 Display upcoming sessions, reschedules, and cancellations to athletes
  - [x] 6.3 Integrate athlete-facing messaging thread in UserDashboard
