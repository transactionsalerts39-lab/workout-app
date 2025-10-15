## Relevant Files

- `src/features/admin/AdminDashboard.tsx` - Primary Plan Builder UI; contains exercise library, selected exercises, and plan designer sections.
- `src/features/admin/AdminSettingsPanel.tsx` - Ensure shared layout/styling helpers stay compatible if components shift.
- `src/lib/exerciseLibrary.ts` - Exercise data fetch utility; may need updates to slim served metadata.
- `src/context/ProgramContext.tsx` - Supplies templates and program data; verify integration after state adjustments.
- `src/features/admin/__tests__/PlanBuilder.test.tsx` - (New) Integration tests for the simplified Plan Builder flow.

### Notes

- Preserve Tailwind patterns already in `AdminDashboard.tsx` to keep styling consistent across panels.
- For drag-and-drop, reuse any existing lightweight utilities before introducing new dependencies and ensure keyboard/touch fallbacks.
- Metadata chips now emit `data-metadata-count="1"` to document the muscle-group-only presentation for QA.
- Selected exercises persist via `localStorage` under `admin:selectedExercises` for quick admin resumption.
- Plan designer auto-generates a plan title preview (athlete + weeks + first exercise) and exposes set/rep inputs per selected exercise.
- Added `data-drag-active` and `data-fallback-action` hooks plus integration coverage to support QA of drag-drop and button flows on tablets.

## Tasks

- [x] 1.0 Refactor Plan Builder layout to show Exercise Library and Selected Exercises side-by-side with Plan Designer stacked beneath.
  - [x] 1.1 Update the AdminDashboard grid to a two-column structure on desktop/tablet with responsive stacking for smaller viewports.
  - [x] 1.2 Adjust section headers, spacing, and sticky behavior to reduce visual noise while keeping context clear.
  - [x] 1.3 Verify the split view maintains usability on tablets (scroll behavior, touch targets, min widths).
- [x] 2.0 Simplify Exercise Library content and controls to highlight only name and primary muscle group while keeping lightweight filters.
  - [x] 2.1 Trim exercise cards to display just the exercise name and primary muscle group.
  - [x] 2.2 Limit filters to name search and muscle group dropdown, removing extra tag filters.
  - [x] 2.3 Confirm visible metadata count meets the ≥50% reduction target and note any remaining tags needed for clarity.
- [x] 3.0 Implement intuitive exercise transfer between panels (drag-and-drop with accessible fallback) and maintain session persistence.
  - [x] 3.1 Introduce drag-and-drop from library to selected list and within selected list for reordering.
  - [x] 3.2 Provide an alternative “Add” control for non-drag contexts and simple remove interaction.
  - [x] 3.3 Ensure selected exercises persist through standard admin session flows (e.g., tab switches, soft refresh).
- [x] 4.0 Streamline Plan Designer to focus on condensed scheduling inputs and direct athlete assignment.
  - [x] 4.1 Reduce Plan Designer form fields to essentials (assignee, duration/weeks, start date, minimal notes).
  - [x] 4.2 Display selected exercises in a condensed format with quick set/rep inputs or presets.
  - [x] 4.3 Simplify the assignment confirmation so coaches complete the flow without extra modal steps.
- [x] 5.0 Add tests and QA hooks to ensure reduced metadata, tablet usability, and the simplified flow meet success metrics.
  - [x] 5.1 Build integration tests covering exercise filtering, add/remove interactions, and assignment submission.
  - [x] 5.2 Add QA checklist items or responsive smoke tests for tablet breakpoints and drag-and-drop fallback.
  - [x] 5.3 Document validation steps for metadata reduction and tablet usability for sign-off.
