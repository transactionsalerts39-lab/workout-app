## Introduction / Overview
Solo personal trainers need a single workspace to intake clients, keep schedules under control, and maintain accountability without juggling spreadsheets, chats, and ad-hoc reminders. The proposed Client Ops Suite extends the existing Workout App contexts to streamline onboarding, scheduling/cancellation handling, and ongoing check-ins so coaches can reduce admin time while improving athlete outcomes.

## Goals
- Capture complete client onboarding details (profile, goals, availability) in one guided flow.
- Provide a scheduling console to plan, reschedule, and track sessions with minimal friction.
- Automate accountability touchpoints (check-in prompts, outstanding tasks) to lift engagement and completion rates.

## User Stories
- As a solo personal trainer, I want to add a new client with their goals, contact info, and preferred times so their plan is ready without manual spreadsheets.
- As a trainer, I want a calendar-style view of each client’s upcoming sessions so I can quickly reschedule or cancel while keeping history intact.
- As a trainer, I want automatic prompts and summaries of missed check-ins so I can follow up before adherence drops.
- As a trainer, I want an in-app messaging log tied to each client so all coaching notes and nudges stay consolidated.

## Functional Requirements
1. The system must provide a “New Client Intake” flow that captures contact details, goals, equipment, schedule preferences, and onboarding notes, persisting them via the existing Supabase/App storage stack.
2. The system must allow trainers to assign or adjust a starter program during intake by selecting from existing `ProgramContext` workout templates or leaving the client unassigned for later configuration.
3. The system must present a scheduling console (list and calendar views) showing upcoming sessions per client, with actions to confirm, reschedule, or cancel while logging the change reason.
4. The system must trigger automated reminders (email, SMS, or in-app notifications) for upcoming sessions, reschedules, and cancellations, using the existing notification primitives or new Supabase functions.
5. The system must track check-in compliance by surfacing missed or late check-ins, enabling one-click reminder sends, and logging responses into `ProgramContext.logCheckIn` for analytics.
6. The system must offer a lightweight message thread per client (trainer ↔ client) with time stamps, leveraging existing state management so that summaries display inside the trainer dashboard and the athlete dashboard chat widget.
7. The system must expose mobile-friendly versions of the intake, scheduling, and messaging screens, adhering to the responsive patterns already used in `UserDashboard` and `AdminDashboard`.

## Non-Goals (Out of Scope)
- None (explicitly confirmed by stakeholder).

## Design Considerations
- Reuse existing shadcn-style UI primitives (`Button`, `Card`, `Badge`, etc.) and the current visual language (gradient hero, surface panels) to ensure consistency across dashboards.
- Calendar/scheduling UI should match the current neutral/dark theme, with badges mirroring existing status variants.

## Technical Considerations
- Continue using Supabase for persistence, realtime updates, and storage. Extend existing tables (`app_users`, `session_progress`) or add new tables/functions as needed, keeping context providers (`ProgramContext`, `ProgressContext`) as single sources of truth.
- Maintain compatibility with local-storage fallback paths in development modes where Supabase credentials are absent.
- Align new state APIs with existing contexts (e.g., client structures, check-in logging) to avoid fragmented models.

## Success Metrics
- Improve weekly check-in completion rates by 20% within four weeks of launch (monitored via `logCheckIn` data).
- Increase weekly workout completion rates by 15% through better scheduling visibility and templates.
- Reduce late cancellations/no-shows by 25% through automated reminders and quick rescheduling flows.

## Open Questions
- None at this time (stakeholder confirmed).
