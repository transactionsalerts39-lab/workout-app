## Relevant Files

- `src/features/admin/AdminDashboard.tsx` - Hosts the admin tab layout; will add the new Settings tab entry point.
- `src/features/admin/AdminSettingsPanel.tsx` - New component for admin account, billing summary, and avatar management UI.
- `src/features/user/UserSettingsScreen.tsx` - New dedicated screen for end-user account settings.
- `src/App.tsx` - Adjust navigation/routing so users can reach the new settings screen.
- `src/context/AuthContext.tsx` - Update stored user fields and expose mutations for credential/profile changes.
- `src/lib/supabaseRepository.ts` - Centralize Supabase updates for usernames, passwords, avatars, and billing reads.
- `src/types/plan.ts` - Extend `StoredUser` (and related types) with avatar and billing fields.
- `supabase/migrations/*` - Apply schema changes for `app_users` and any billing summary tables or views.
- `src/lib/security.ts` - Reuse/extend password verification helpers required during update flows.
- `src/components/ui/*` - Leverage existing Inputs, Buttons, Avatars, and Toasts for consistent styling.

### Notes

- Co-locate new component tests alongside their implementations (e.g., `AdminSettingsPanel.test.tsx`).
- Use `npm run test` (Vitest) for component/unit coverage; create focused tests for auth update flows and upload logic.

## Tasks

- [x] 1.0 Prepare Supabase schema and TypeScript models for new account fields (avatar URL, billing summary data) and ensure local seed data stays in sync.
  - [x] 1.1 Create Supabase migration adding `avatar_url` (text) and billing columns (`plan_name`, `billing_interval`, `renewal_date`) to `app_users` or related tables; backfill defaults.
  - [x] 1.2 Update Supabase seed data and local mock data (`loadStoredUsers` defaults) to include the new fields.
  - [x] 1.3 Extend TypeScript types (`StoredUser`, Supabase row interfaces) to reflect added columns.
  - [x] 1.4 Refresh generated types if using Supabase codegen (or update manual definitions) and ensure repository helpers read new fields.
- [ ] 2.0 Implement the Admin dashboard Settings tab with username/password update flows and secure current-password validation.
  - [x] 2.1 Add a `Settings` tab entry to `AdminDashboard.tsx` and render a new `AdminSettingsPanel`.
  - [x] 2.2 Build the admin account form with inputs for current password and new username; wire up validation and disable submit while pending.
  - [x] 2.3 Implement Supabase query to verify current password (using `verifyPassword`) before allowing username updates; update stored username and display name on success.
  - [x] 2.4 Create admin password-change form with current/new/confirm fields, applying password strength checks and matching validation.
  - [x] 2.5 Update Supabase repository to hash and persist new password/salt after verification; surface success/error feedback in the panel.
- [ ] 3.0 Integrate admin billing summary display and Supabase Storage-backed avatar upload with preview/retry handling.
  - [ ] 3.1 Fetch billing snapshot data (existing context or new query) and render a read-only card inside the admin settings.
  - [ ] 3.2 Implement avatar upload flow: file picker, size/type validation, preview, and call to Supabase Storage bucket.
  - [ ] 3.3 Persist returned avatar URL to `app_users`, update local auth state, and show optimistic preview with rollback on failure.
  - [ ] 3.4 Add ability to remove/replace the avatar, resetting to default while updating Supabase as needed.
- [ ] 4.0 Deliver the dedicated user Settings screen with navigation entry, reusing styling and credential/photo flows tailored for athletes.
  - [ ] 4.1 Add routing/navigation hook (e.g., button in header or avatar dropdown) that routes users to a new `/settings` screen.
  - [ ] 4.2 Implement `UserSettingsScreen` mirroring dashboard styling with cards for username/password change (requiring current password).
  - [ ] 4.3 Reuse shared hooks/utilities for credential updates; ensure success/error messages align with admin flows.
  - [ ] 4.4 Integrate avatar upload UI for users, leveraging the same Supabase Storage logic while scoping to current user.
- [ ] 5.0 Update shared auth/data utilities, persistence, and tests to keep UI state in sync after credential or profile updates.
  - [ ] 5.1 Enhance `AuthContext` to refresh `user` and `users` arrays after any update (username/password/avatar).
  - [ ] 5.2 Update local storage persistence (`persistUsers`) to store new fields when Supabase is unavailable.
  - [ ] 5.3 Add or update unit tests covering credential verification, Supabase update helpers, and context state refresh.
  - [ ] 5.4 Document manual QA steps (e.g., password change flow, avatar upload) for regression tracking.
