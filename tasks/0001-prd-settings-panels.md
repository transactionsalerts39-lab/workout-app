# Settings Panel Enhancements PRD

## 1. Introduction / Overview
Create dedicated settings experiences for both administrator and standard users within the workout app. Administrators need streamlined controls to manage account credentials, review billing status, and update their profile identity. Standard users require a focused area to manage account credentials and profile photo while keeping the established dashboard aesthetics. The goal is to deliver clear, secure account management surfaces that align with existing design language and persist changes through Supabase.

## 2. Goals
- Provide a new “Settings” tab inside the admin dashboard with account, billing summary, and profile photo management.
- Launch a dedicated end-user Settings screen reachable from the existing user navigation with the current visual style.
- Persist username, password, and profile photo updates to the Supabase `app_users` table and related storage so the changes are reflected across sessions.
- Ensure sensitive updates (username, password) are gated by current-password confirmation.

## 3. User Stories
- As an **admin coach**, I want to update my username after confirming my current password so that my profile stays secure.
- As an **admin coach**, I want to upload a new profile picture so that my communications display current branding.
- As an **admin coach**, I want to view my current subscription plan details so I understand billing status without leaving the dashboard.
- As an **athlete user**, I want to change my password and username from a dedicated settings page so I can manage my account without contacting support.
- As an **athlete user**, I want to upload a profile photo with the same look and feel as the dashboard so my profile feels consistent across the app.

## 4. Functional Requirements
1. **Admin Settings Access**
   - Add a new `Settings` tab to the admin dashboard tab bar (`AdminDashboard.tsx`) that loads the admin settings panel.
2. **Admin Username Update**
   - Provide inputs for current password, new username, and username confirmation.
   - Validate that the current password matches Supabase credentials before submission.
   - On success, update the `username` (and corresponding display name if necessary) in `app_users`, refresh in-memory auth state, and show success feedback.
3. **Admin Password Update**
   - Require current password, new password, and confirmation with inline validation for strength (reuse existing validation rules if available).
   - Verify the current password against the stored hash via Supabase, then update hash and salt within `app_users`.
   - Provide success and failure states; disable submit while processing.
4. **Admin Billing Summary (Read-only)**
   - Display current plan name, billing interval, renewal date, and status in a read-only card.
   - Source data from existing revenue/subscription context or introduce a Supabase view/REST fetch if not yet surfaced.
   - Include contextual messaging if billing data is unavailable.
5. **Admin Profile Photo Upload**
   - Allow admins to upload an image (jpg/png) up to a defined size limit (e.g., 5 MB).
   - Store the asset in Supabase Storage (e.g., `avatars` bucket) and persist the resulting public URL in `app_users.avatar_url`.
   - Show upload progress, preview, and allow removing/replacing the current photo.
6. **User Settings Screen**
   - Create a dedicated `/settings` (or similar) route for authenticated users that mirrors the primary dashboard styling (glassmorphism cards, buttons).
   - Surface navigation entry (e.g., avatar dropdown or sidebar link) so users can reach the page from anywhere post-login.
7. **User Username Update**
   - Include current-password verification and new-username input following the same validation and persistence rules as admin updates.
8. **User Password Update**
   - Mirror the admin password-change flow with current-password validation and Supabase hash updates.
9. **User Profile Photo Upload**
   - Reuse the Supabase storage flow from admin, scoped to the logged-in user, with preview and replace/remove options.
10. **Feedback & Error Handling**
    - All update actions must show success toasts/banners and detailed error states (invalid password, network failure, oversized file).
    - Disable submit buttons during pending requests; re-enable on completion.

## 5. Non-Goals (Out of Scope)
- Managing other users’ accounts or resetting passwords on their behalf.
- Editing billing plans, payment methods, or initiating subscription changes from the UI.
- Adding new profile fields beyond existing username/display name and photo requirements.
- Implementing multi-factor authentication or advanced security hardening beyond current password confirmation.

## 6. Design Considerations
- Maintain the app’s existing glassmorphism aesthetic: rounded cards, subtle borders, neutral typography.
- Align spacing, headings, and form controls with existing `Card`, `Input`, `Button`, `Label`, and `Avatar` components.
- Use tab and navigation styles consistent with current dashboard patterns (Radix UI components already in use).
- Provide responsive layouts that stack form sections vertically on small screens.

## 7. Technical Considerations
- Extend the Supabase `app_users` table to include `avatar_url` and any required billing fields (`plan_name`, `billing_interval`, `renewal_date`, etc.) if not present.
- Update `StoredUser` type, `AuthContext`, and `supabaseRepository` helpers to read/write new fields and keep local state in sync.
- Implement password verification and update through existing security utilities (`hashPassword`, `verifyPassword`) to avoid duplication.
- Configure Supabase Storage bucket policy to allow authenticated uploads and retrieve public URLs (or sign URLs if needed).
- Ensure username updates propagate to dependent contexts (e.g., chat, check-ins) via context refresh or invalidating React Query caches.
- Audit existing routing to insert the user settings screen without disrupting navigation guards.

## 8. Success Metrics
- 80% of admins visit the Settings tab within two weeks of release.
- 50% of active admins upload a profile photo within one month.
- 25% reduction in support requests related to username/password changes within one quarter.
- Less than 2% error rate on credential updates (tracked via logging).

## 9. Open Questions
- What is the definitive data source for billing summary details (Supabase table vs. existing context mock data)? 
- Are there password complexity requirements beyond current implementation (e.g., minimum length, character mix)?
- Should deleting an existing profile photo be supported (reverting to default avatar)?
- Do we need to notify other parts of the app (e.g., push events) when usernames change for consistency in historical data?
