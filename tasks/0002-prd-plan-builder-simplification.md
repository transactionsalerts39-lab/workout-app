# Plan Builder Simplification PRD

## Introduction / Overview
Coaches report that the current Plan Builder overwhelms them with information while moving an exercise from the library into a training plan. The objective is to streamline the three core actions—browsing the exercise library, curating the selected exercises list, and assigning those exercises to athletes—by reducing on-screen clutter and clarifying the workflow.

## Goals
- Present the exercise library and selected exercises panels side-by-side to reinforce the picklist relationship.
- Reduce visible exercise metadata by at least 50% versus the current experience to lower cognitive load.
- Simplify plan assignment so coaches can confidently assign curated exercises to athletes without navigating dense UI.
- Ensure the full flow remains usable on tablets commonly used on the gym floor.

## User Stories
- As a coach, I want to browse the exercise library with only the essential details so that I can spot relevant exercises quickly.
- As a coach, I want to add or remove exercises from my selected list without leaving the library view so that I can build a session efficiently.
- As a coach, I want to assign the selected exercises to an athlete or team with minimal steps so that I can focus on coaching instead of the interface.

## Functional Requirements
1. Display the Exercise Library and Selected Exercises panels simultaneously in a split view layout (desktop and tablet breakpoints).
2. Show only exercise name and primary muscle group within the Exercise Library list; additional metadata must be hidden by default.
3. Provide inline filters in the Exercise Library for the metadata that remains (muscle group, exercise name search).
4. Enable drag-and-drop from the Exercise Library into Selected Exercises; the first drop should create a list entry with default settings.
5. Support drag-and-drop reordering within Selected Exercises and drag-out to remove an item.
6. Surface an “Add” affordance alternative (e.g., + button) for environments where drag-and-drop is unavailable.
7. Persist Selected Exercises state during the session, allowing coaches to move between panels without losing selections.
8. Present the Plan Designer directly beneath the parallel panels, showing only the selected exercises with condensed scheduling controls (sets, reps, optional notes).
9. Provide streamlined assignment actions to attach the selected exercise set to one or more athletes or teams without opening additional modal flows.
10. Ensure touch targets and spacing conform to tablet usability guidelines (e.g., 44px minimum touch target).

## Non-Goals (Out of Scope)
- Introducing new exercise metadata or expanding advanced tagging functionality.
- Rebuilding analytics, reporting, or athlete management workflows.
- Changing how exercise data is stored or synced from upstream systems.

## Design Considerations
- Use a clean two-column layout for Exercise Library and Selected Exercises with consistent typography and whitespace.
- Keep the Plan Designer directly below the parallel panels, clearly labeled to indicate the next step in the workflow.
- Ensure motion (drag-and-drop) includes subtle feedback to confirm successful actions.

## Technical Considerations
- Confirm drag-and-drop library availability across supported browsers and implement accessible fallbacks (keyboard, touch).
- Audit existing state management to persist the selected list and plan assignment context within the session.
- Reuse current exercise data endpoints but reduce the payload rendered in the list to required fields only.

## Success Metrics
- Reduce the number of visible metadata fields per exercise by ≥50% compared to the current production UI.
- Validate that the end-to-end flow (select exercise, add to selected list, assign in plan designer) remains fully usable on tablets without layout regressions.

## Open Questions
- Do coaches need any quick filters (e.g., equipment availability) that remain lightweight enough for the simplified list?
- Should the Plan Designer include any default set/rep templates per athlete profile, or is manual entry sufficient?
- Are there specific tablet models or screen sizes that require targeted testing?
