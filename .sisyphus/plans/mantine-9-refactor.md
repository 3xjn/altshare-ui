# Mantine 9 Full Migration and Readability Refactor

## TL;DR
> **Summary**: Replace the active shadcn/Radix/Tailwind UI layer with Mantine 9 on top of a React 19.2+ prerequisite upgrade, while preserving existing routes, store contracts, feature flows, and overall behavior. Improve readability by decomposing oversized UI files and internally cleaning up `AccountStore.ts` without redesigning business logic.
> **Deliverables**:
> - React 19.2+ + Mantine 9 dependency alignment under Bun
> - Mantine provider/theme/notifications shell
> - Mantine-backed shared primitives and migrated feature surfaces
> - Behavior-preserving decomposition of monolithic pages/components/store internals
> - Minimal automated characterization coverage for high-risk seams
> - Removal of obsolete shadcn/Radix/next-themes/Tailwind UI residue after parity is reached
> **Effort**: XL
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 3 → 4 → 5/6/7 → 10/12/14 → 11/13 → 15

## Context
### Original Request
Plan a refactor of this codebase to use `mantine@9.0.0`, clean up monolithic files, keep the codebase readable, preserve the same existing features, and avoid intended UX changes beyond small inherent library differences. Preserve the overall user flow.

### Interview Summary
- Active UI is currently shadcn/Radix/Tailwind with `next-themes`; Mantine packages exist at `^7.17.4` in `package.json` but are not currently used in `src/`.
- User chose **full replacement** of current app surfaces with Mantine in this implementation pass.
- User chose **minimal automated coverage** rather than manual-only verification.
- User chose **Mantine defaults acceptable** as long as features and major flows stay intact.
- User explicitly included **store refactor** in scope, but repo coupling analysis showed the safe version is internal decomposition/helper extraction with the public `useAccountStore` API kept stable.
- Current repo uses **Bun** and is on **React 18.3.1**, so Mantine 9 requires a prerequisite React upgrade.

### Metis Review (gaps addressed)
- Added a dedicated prerequisite wave for React 19.2+ and Bun lockfile refresh.
- Added guardrails for toast behavior, modal focus behavior, select semantics, row context menus, and theme persistence.
- Blocked scope creep into route/API/store redesign, global Tailwind eradication, and generic redesign work.
- Required characterization tests for high-risk seams so “minimal automated coverage” does not collapse to lint/build-only verification.
- Forced old-stack removal into the final cleanup wave instead of opportunistic mid-migration deletion.

## Work Objectives
### Core Objective
Migrate the app’s active UI system to Mantine 9 while preserving runtime behavior and feature flow, and improve maintainability by decomposing oversized files into smaller, clearer boundaries.

### Deliverables
- React 19.2+ compatible dependency graph under Bun
- `MantineProvider`-based app shell with notifications and stable theme persistence
- Mantine-backed replacements for current shared UI seams
- Migrated auth, invite, modal, and accounts surfaces
- `Accounts.tsx` decomposition into container/presenter boundaries
- `AccountStore.ts` internal cleanup via type/helper extraction without public API change
- Minimal characterization tests for high-risk seams
- Removal of obsolete shadcn/Radix/next-themes/Tailwind UI dependencies and wrappers no longer used

### Definition of Done (verifiable conditions with commands)
- `bun install` completes with React 19.2+ and Mantine 9 resolved in `bun.lock`
- `bun run lint` passes from repo root
- `bun run build` passes from repo root
- `bunx vitest run` passes for all newly added characterization/component tests
- `bunx vitest run src/hooks/use-toast.test.ts` passes
- `bunx vitest run src/stores/AccountStore.test.ts` passes
- `bunx vitest run src/components/accounts/useAccountSelection.test.ts` passes
- `bunx vitest run src/components/AddAccountDialog.test.tsx` passes
- `bunx vitest run src/components/accounts/AccountsTable.test.tsx` passes
- `powershell -Command "Get-ChildItem -Recurse src -Include *.ts,*.tsx | Select-String -Pattern '@radix-ui'"` returns no unexpected matches after cleanup
- `powershell -Command "Get-ChildItem -Recurse src -Include *.ts,*.tsx | Select-String -Pattern 'next-themes'"` returns no matches after cleanup

### Must Have
- Preserve existing routes, store action names, state field names, query behaviors, and feature flows
- Preserve `useAccountStore` public contract and exported `Account` / `AccountGroup` compatibility
- Preserve current imperative toast call sites through an adapter during migration
- Preserve row-selection and context-menu semantics on the accounts surface
- Preserve invite acceptance, auth success/failure, account CRUD, sharing, and rank-loading behavior
- Keep each migration wave independently verifiable with lint, build, and targeted tests

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No route restructuring
- No API layer rewrite
- No redesign or information-architecture changes
- No broad Tailwind purge outside migrated UI surfaces
- No Zustand public API redesign
- No replacement of high-risk interactions by “close enough” Mantine defaults without explicit parity checks
- No dead dependency cleanup before the final migration wave
- No introduction of a new grid/data-table library in this pass

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **TDD** for high-risk seams only, using minimal characterization-first coverage with Vitest + React Testing Library
- QA policy: Every task includes agent-executed happy-path and failure/edge-case scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: prerequisites and compatibility foundation (1-5)
- dependency alignment
- test harness + characterization baseline
- root Mantine provider/theme/notifications
- toast/theme compatibility adapters
- low-risk shared field/action primitives

Wave 2: high-leverage shared seams and lower-risk feature migration (6-10)
- dialogs/modals
- selects/comboboxes
- menu/context-menu abstraction
- table/text-label display seam
- auth + invite surfaces

Wave 3: high-risk accounts area and internal cleanup (11-15)
- accounts page decomposition
- modal workflow migration
- accounts interaction surface migration
- AccountStore internal decomposition
- final old-stack cleanup

### Dependency Matrix (full, all tasks)
| Task | Depends On | Unlocks |
|---|---|---|
| 1 | — | 2, 3, 5-15 |
| 2 | 1 | 4-15 |
| 3 | 1 | 4-15 |
| 4 | 2, 3 | 5, 10-15 |
| 5 | 2, 3 | 10-15 |
| 6 | 2, 3, 5 | 12, 13 |
| 7 | 2, 3, 5 | 10, 12, 13 |
| 8 | 2, 3, 5 | 13 |
| 9 | 2, 3, 5 | 13 |
| 10 | 4, 5, 7 | 15 |
| 11 | 4, 5 | 12, 13, 14 |
| 12 | 4, 5, 6, 7, 11 | 13, 15 |
| 13 | 4, 5, 6, 7, 8, 9, 11, 12 | 15 |
| 14 | 2, 11 | 15 |
| 15 | 10, 12, 13, 14 | Final verification |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 5 tasks → `unspecified-high`, `visual-engineering`
- Wave 2 → 5 tasks → `visual-engineering`, `unspecified-high`
- Wave 3 → 5 tasks → `deep`, `visual-engineering`, `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Upgrade React and Mantine prerequisites under Bun

  **What to do**: Upgrade `react`, `react-dom`, `@types/react`, and `@types/react-dom` to React 19.2+-compatible versions; upgrade all installed `@mantine/*` packages to `9.0.0`; refresh `bun.lock`; add any required Mantine peer/runtime packages discovered during install; keep app behavior unchanged at this stage.
  **Must NOT do**: Do not start replacing UI components; do not remove shadcn/Radix/Tailwind/next-themes yet; do not change routes, store APIs, or app logic.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: dependency graph changes plus TypeScript/runtime fallout management
  - Skills: `[]` — no special skill needed beyond repo-aware dependency work
  - Omitted: `frontend-design` — no visual work should happen in this task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-15 | Blocked By: none

  **References**:
  - Pattern: `package.json` — current dependency declarations and scripts
  - Pattern: `bun.lock` — current Bun-resolved dependency graph
  - Pattern: `vite.config.ts` — build entry to keep stable during upgrade
  - External: `https://mantine.dev/guides/8x-to-9x/` — Mantine 9 migration requirements

  **Acceptance Criteria**:
  - [ ] `bun install` completes successfully
  - [ ] `bun run lint` passes
  - [ ] `bun run build` passes
  - [ ] `package.json` shows `@mantine/*` aligned to `9.0.0`
  - [ ] `bun.lock` resolves React 19.2+ and Mantine 9 packages

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Dependency upgrade succeeds
    Tool: Bash
    Steps: Run `bun install`; then run `bun run lint`; then run `bun run build`
    Expected: All commands exit 0 with no unresolved peer dependency or type errors
    Evidence: .sisyphus/evidence/task-1-react-mantine-prereqs.txt

  Scenario: Unsupported dependency drift is caught
    Tool: Bash
    Steps: Run `bun run build` immediately after the upgrade before any UI migration work
    Expected: Build either passes cleanly or fails only on identified compatibility issues that are fixed within this task; no hidden runtime prerequisites remain unrecorded
    Evidence: .sisyphus/evidence/task-1-react-mantine-prereqs-build.txt
  ```

  **Commit**: YES | Message: `chore(deps): upgrade react and mantine prerequisites` | Files: `package.json`, `bun.lock`, any dependency config touched by prerequisite fixes

- [ ] 2. Add minimal characterization test harness and verification scripts

  **What to do**: Introduce Vitest + React Testing Library + jsdom only to the extent needed for behavior-preserving characterization tests; add a dedicated `test` or `test:run` script and a dedicated `typecheck` script if absent; create baseline tests for toast contract, `useAccountSelection`, and `useAccountStore` public behavior so later UI swaps have executable regression checks.
  **Must NOT do**: Do not attempt broad coverage; do not add Playwright/Cypress; do not rewrite production code just to make tests “cleaner” beyond adding stable test seams that support the planned migration.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: test infrastructure must fit an existing Vite/Bun/TS stack cleanly
  - Skills: `[]` — direct repository patterns are more important than generic testing guidance
  - Omitted: `audit` — this is focused verification infrastructure, not a broad quality audit

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4-15 | Blocked By: 1

  **References**:
  - Pattern: `package.json` — current script surface (`build`, `lint`) and missing test commands
  - Pattern: `tsconfig.json` / `tsconfig.app.json` — TS setup to keep compatible with Vitest
  - Pattern: `src/hooks/use-toast.ts` — contract requiring characterization coverage
  - Pattern: `src/components/accounts/useAccountSelection.ts` — selection semantics needing regression tests
  - Pattern: `src/stores/AccountStore.ts` — public store contract needing lock-in coverage

  **Acceptance Criteria**:
  - [ ] `bunx vitest run` executes successfully
  - [ ] `bunx vitest run src/hooks/use-toast.test.ts` passes
  - [ ] `bunx vitest run src/components/accounts/useAccountSelection.test.ts` passes
  - [ ] `bunx vitest run src/stores/AccountStore.test.ts` passes
  - [ ] `package.json` exposes a repeatable test command and a dedicated typecheck command

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: High-risk contract tests run end-to-end
    Tool: Bash
    Steps: Run `bunx vitest run src/hooks/use-toast.test.ts src/components/accounts/useAccountSelection.test.ts src/stores/AccountStore.test.ts`
    Expected: All three suites pass and produce deterministic assertions for existing contracts
    Evidence: .sisyphus/evidence/task-2-test-harness.txt

  Scenario: Missing environment wiring is detected early
    Tool: Bash
    Steps: Run `bunx vitest run`
    Expected: Test runner starts under jsdom without config/import failures; if it fails, the task is not complete until config is corrected
    Evidence: .sisyphus/evidence/task-2-test-harness-full.txt
  ```

  **Commit**: YES | Message: `test(ui): add characterization coverage for critical seams` | Files: `package.json`, test config files, `src/**/*.test.*`

- [ ] 3. Bootstrap Mantine app shell, theme, and root CSS imports

  **What to do**: Add Mantine 9 root wiring in `src/main.tsx`, including `MantineProvider` and required Mantine CSS imports; define a Mantine theme object that accepts library defaults unless a functional regression requires override; keep router structure and existing app entry stable; stage color-scheme handling so current theme persistence remains functional during migration.
  **Must NOT do**: Do not migrate individual features yet; do not remove `next-themes` in this task; do not introduce `AppShell` unless existing layout genuinely needs it; do not change route composition.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: root UI shell wiring and theme/provider setup affect all component rendering
  - Skills: [`design-system-patterns`] — needed for clean Mantine provider/theme setup without overbuilding
  - Omitted: [`frontend-design`] — no redesign is in scope

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4-15 | Blocked By: 1

  **References**:
  - Pattern: `src/main.tsx` — current providers and router composition
  - Pattern: `src/components/theme-provider.tsx` — current theme persistence seam
  - Pattern: `src/index.css` — current CSS token and global style source
  - External: `https://mantine.dev/getting-started/` — required CSS/provider setup
  - External: `https://mantine.dev/theming/mantine-provider/` — Mantine provider behavior

  **Acceptance Criteria**:
  - [ ] `src/main.tsx` mounts Mantine 9 provider infrastructure without changing route behavior
  - [ ] Required Mantine CSS imports are present and build successfully
  - [ ] `bun run build` passes after root provider introduction
  - [ ] Root provider smoke tests pass

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Root provider mounts successfully
    Tool: Bash
    Steps: Run `bunx vitest run src/main.test.tsx`
    Expected: Test confirms the app renders under `MantineProvider` with router and notifications root mounted
    Evidence: .sisyphus/evidence/task-3-mantine-shell.txt

  Scenario: Missing CSS/provider wiring is caught
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without missing-style import or provider-related runtime bundling errors
    Evidence: .sisyphus/evidence/task-3-mantine-shell-build.txt
  ```

  **Commit**: YES | Message: `refactor(app): add mantine provider and root theme wiring` | Files: `src/main.tsx`, theme files, root CSS imports

- [ ] 4. Preserve toast and theme contracts behind Mantine-compatible adapters

  **What to do**: Rework the current toast and theme plumbing so existing app call sites can continue using the same imperative contracts while Mantine notifications and Mantine-backed color-scheme handling are introduced under the hood; preserve single-toast semantics unless a test proves current behavior differs; keep theme persistence stable throughout the transition.
  **Must NOT do**: Do not update every toast call site yet; do not remove `use-toast` API surface; do not remove `next-themes` until all migrated surfaces are proven stable and no callers remain.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: adapter design plus behavior preservation across many callers
  - Skills: [] — contract preservation is repo-specific
  - Omitted: [`clarify`] — no UX-copy rewrite is involved

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 10-15 | Blocked By: 2, 3

  **References**:
  - Pattern: `src/hooks/use-toast.ts` — imperative notification contract to preserve
  - Pattern: `src/components/ui/toast.tsx` — current toast rendering semantics
  - Pattern: `src/components/ui/toaster.tsx` — root notification mount seam
  - Pattern: `src/components/theme-provider.tsx` — current theme persistence behavior
  - Pattern: `src/main.tsx` — app-root provider ordering
  - External: `https://mantine.dev/x/notifications/` — Mantine notifications API

  **Acceptance Criteria**:
  - [ ] Existing toast callers remain compatible without mass call-site edits
  - [ ] Notification rendering is powered by Mantine notifications
  - [ ] Theme persistence remains stable across reload-oriented tests
  - [ ] `bunx vitest run src/hooks/use-toast.test.ts` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Toast adapter preserves current imperative behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/hooks/use-toast.test.ts`
    Expected: Tests confirm one active toast at a time, destructive variant mapping, and stable dismiss/update behavior
    Evidence: .sisyphus/evidence/task-4-toast-theme-adapter.txt

  Scenario: Theme persistence does not regress during provider bridge stage
    Tool: Bash
    Steps: Run `bunx vitest run src/components/theme-provider.test.tsx`
    Expected: Tests confirm stored theme state is reapplied after rerender/remount and no missing provider errors occur
    Evidence: .sisyphus/evidence/task-4-toast-theme-adapter-theme.txt
  ```

  **Commit**: YES | Message: `refactor(app): add mantine-compatible toast and theme adapters` | Files: `src/hooks/use-toast.ts`, `src/components/ui/toaster.tsx`, `src/components/theme-provider.tsx`, related tests

- [ ] 5. Replace low-risk shared field and action primitives with Mantine-backed wrappers

  **What to do**: Reimplement the current shared low-risk wrappers on top of Mantine while preserving import paths and caller-facing props wherever practical: `button`, `input`, `textarea`, `card`, and `progress`; preserve password visibility behavior from the current input wrapper; keep className passthroughs needed by current consumers.
  **Must NOT do**: Do not migrate dialogs, menus, selects, or table behavior in this task; do not rewrite feature pages yet; do not remove compatibility props that current consumers rely on without updating all consumers in the same task.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: component-library replacement with stable behavior and prop mapping
  - Skills: [`design-system-patterns`] — helps create clean Mantine-backed shared seams
  - Omitted: [`bolder`] — no visual enhancement work belongs here

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6-15 | Blocked By: 2, 3

  **References**:
  - Pattern: `src/components/ui/button.tsx` — current widely used action primitive
  - Pattern: `src/components/ui/input.tsx` — current text/password field behavior including visibility toggle
  - Pattern: `src/components/ui/textarea.tsx` — multiline input contract
  - Pattern: `src/components/ui/card.tsx` — auth/invite surface wrapper
  - Pattern: `src/components/ui/progress.tsx` — current loading indicator seam
  - Consumer: `src/components/login-form.tsx` — representative form usage
  - Consumer: `src/components/signup-form.tsx` — representative multi-field usage
  - Consumer: `src/pages/Invite.tsx` — representative card/loader usage

  **Acceptance Criteria**:
  - [ ] Shared wrapper import paths remain stable for existing consumers
  - [ ] `bunx vitest run src/components/ui/input.test.tsx` passes
  - [ ] `bunx vitest run src/components/ui/button.test.tsx` passes
  - [ ] `bun run lint` passes
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Mantine-backed field/action wrappers preserve core behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/ui/button.test.tsx src/components/ui/input.test.tsx src/components/ui/textarea.test.tsx src/components/ui/card.test.tsx src/components/ui/progress.test.tsx`
    Expected: Tests confirm button click/disabled states, password visibility toggle, textarea value changes, card content rendering, and loader rendering all behave as expected
    Evidence: .sisyphus/evidence/task-5-shared-primitives.txt

  Scenario: Wrapper prop compatibility regressions are caught
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without consumer prop/type errors from wrapper replacement
    Evidence: .sisyphus/evidence/task-5-shared-primitives-build.txt
  ```

  **Commit**: YES | Message: `refactor(ui): migrate low-risk shared primitives to mantine` | Files: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/card.tsx`, `src/components/ui/progress.tsx`, related tests

- [ ] 6. Replace dialog and modal infrastructure with Mantine Modal-based composition

  **What to do**: Replace the shared dialog wrapper layer with a Mantine `Modal`-based implementation or a small Mantine-backed compatibility abstraction that supports current modal consumers; preserve escape-close, focus trap, close buttons, titles, and focus-return behavior required by current modal flows.
  **Must NOT do**: Do not migrate the actual account modal business flows yet; do not use Mantine `Dialog` for core modal flows; do not change submit/cancel semantics while swapping infrastructure.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: overlay behavior and accessibility semantics are the main risk
  - Skills: [`design-system-patterns`] — needed for a small compatibility abstraction instead of ad hoc rewrites
  - Omitted: [`animate`] — motion changes are out of scope

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 12, 13 | Blocked By: 2, 3, 5

  **References**:
  - Pattern: `src/components/ui/dialog.tsx` — current Radix modal abstraction
  - Consumer: `src/components/AddAccountDialog.tsx` — heaviest modal consumer
  - Consumer: `src/components/accounts/InviteModal.tsx` — select-in-modal pattern
  - Consumer: `src/components/accounts/SharingModal.tsx` — list/action modal pattern
  - Consumer: `src/components/accounts/NewGroupModal.tsx` — simple form modal pattern
  - Consumer: `src/components/PasswordPrompt.tsx` — password modal edge case
  - External: `https://mantine.dev/core/modal/` — Mantine Modal behavior

  **Acceptance Criteria**:
  - [ ] Shared dialog imports resolve to Mantine-backed modal infrastructure
  - [ ] Modal tests verify Escape close and focus return behavior
  - [ ] `bun run build` passes with all modal consumers still compiling

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Modal infrastructure preserves focus and close behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/ui/dialog.test.tsx`
    Expected: Tests confirm open/close lifecycle, Escape handling, and focus returns to the trigger element after close
    Evidence: .sisyphus/evidence/task-6-modal-layer.txt

  Scenario: Modal consumer compatibility issues are surfaced immediately
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without broken imports or invalid modal prop usage in current consumers
    Evidence: .sisyphus/evidence/task-6-modal-layer-build.txt
  ```

  **Commit**: YES | Message: `refactor(ui): replace dialog infrastructure with mantine modal` | Files: `src/components/ui/dialog.tsx`, related modal tests, any shared modal helpers

- [ ] 7. Replace select infrastructure with Mantine Select or Combobox while preserving current value semantics

  **What to do**: Replace the current select wrapper with Mantine-backed select infrastructure; use `Select` where simple data-driven behavior is enough and `Combobox` where the current UI requires richer custom rendering or behavioral parity; preserve default group selection, current game/group value handling, and clear/error states used in forms.
  **Must NOT do**: Do not flatten custom item rendering into plain text if current consumers rely on icons/structured labels; do not change selected value shape; do not bundle menu/context-menu migration into this task.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: controlled input semantics and custom item rendering are the core risk
  - Skills: [`design-system-patterns`] — helps map compound selects onto Mantine without leaking complexity to consumers
  - Omitted: [`normalize`] — this is not a style consistency pass

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10, 12, 13 | Blocked By: 2, 3, 5

  **References**:
  - Pattern: `src/components/ui/select.tsx` — current select API
  - Consumer: `src/components/AddAccountDialog.tsx` — game and group selection with richer item rendering
  - Consumer: `src/components/accounts/InviteModal.tsx` — invite target selection
  - Consumer: `src/components/accounts/AccountsToolbar.tsx` — group filter selection
  - External: `https://mantine.dev/core/select/` — Mantine Select API
  - External: `https://mantine.dev/core/combobox/` — Mantine Combobox for custom item cases

  **Acceptance Criteria**:
  - [ ] Shared select import path remains stable or all consumers are updated in the same task
  - [ ] `bunx vitest run src/components/ui/select.test.tsx` passes
  - [ ] `bunx vitest run src/components/AddAccountDialog.select.test.tsx` passes
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Select wrapper preserves value and defaulting behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/ui/select.test.tsx src/components/AddAccountDialog.select.test.tsx`
    Expected: Tests confirm initial value rendering, change handling, default group selection, and custom item rendering where required
    Evidence: .sisyphus/evidence/task-7-select-layer.txt

  Scenario: Value-shape regressions fail fast
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without select consumer type errors or invalid controlled/uncontrolled warnings in tests
    Evidence: .sisyphus/evidence/task-7-select-layer-build.txt
  ```

  **Commit**: YES | Message: `refactor(ui): migrate shared select infrastructure to mantine` | Files: `src/components/ui/select.tsx`, select-focused tests, any combobox helpers

- [ ] 8. Replace dropdown and context-menu infrastructure with Mantine-backed menu composition

  **What to do**: Replace the current dropdown-menu layer with Mantine-backed `Menu`/`Popover` composition that can support both regular dropdown actions and the accounts table’s controlled/right-click interaction model; preserve submenu behavior in `SelectionMenuContent` and keep row-action semantics stable.
  **Must NOT do**: Do not assume Mantine `Menu` is a 1:1 slot replacement; do not migrate the entire accounts table in this task; do not degrade right-click selection behavior into left-click-only menus.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: interaction parity is more important than styling here
  - Skills: [] — behavior preservation is app-specific
  - Omitted: [`frontend-design`] — this task is interaction-layer migration, not redesign

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13 | Blocked By: 2, 3, 5

  **References**:
  - Pattern: `src/components/ui/dropdown-menu.tsx` — current menu abstraction
  - Consumer: `src/components/accounts/SelectionMenuContent.tsx` — submenu-heavy action content
  - Consumer: `src/components/accounts/AccountsToolbar.tsx` — bulk action menu usage
  - Consumer: `src/components/accounts/AccountsHeader.tsx` — header actions
  - Consumer: `src/components/accounts/AccountsTable.tsx` — right-click/context-positioned row actions
  - External: `https://mantine.dev/core/menu/` — Mantine menu API

  **Acceptance Criteria**:
  - [ ] Menu infrastructure supports regular dropdown actions and right-click/context-driven menu opening
  - [ ] Submenu behavior remains covered by tests
  - [ ] `bunx vitest run src/components/ui/dropdown-menu.test.tsx` passes
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Menu layer preserves submenu and context-open behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/ui/dropdown-menu.test.tsx src/components/accounts/SelectionMenuContent.test.tsx`
    Expected: Tests confirm nested action rendering, keyboard navigation, and controlled open state for context-driven menus
    Evidence: .sisyphus/evidence/task-8-menu-layer.txt

  Scenario: Accounts consumers remain compatible with the new menu layer
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without broken action menu imports or event-signature mismatches in account-related consumers
    Evidence: .sisyphus/evidence/task-8-menu-layer-build.txt
  ```

  **Commit**: YES | Message: `refactor(ui): replace dropdown infrastructure with mantine menu composition` | Files: `src/components/ui/dropdown-menu.tsx`, related menu tests, menu helper files

- [ ] 9. Replace table, text-label, and account row display seams with Mantine-backed implementations

  **What to do**: Rebuild the shared table wrapper on Mantine `Table` plus any required `ScrollArea` support; migrate `text-label` into a Mantine-backed feature component that still supports masked/copyable values; preserve row density well enough for existing flows while accepting small Mantine default styling differences.
  **Must NOT do**: Do not migrate accounts page orchestration in this task; do not lose copy/mask behavior from `text-label`; do not assume Mantine `Table` alone provides current interaction behaviors.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: display-layer migration plus feature component preservation
  - Skills: [`design-system-patterns`] — useful for deciding which parts stay feature-specific instead of becoming generic wrappers
  - Omitted: [`extract`] — do not broaden this into design-system invention

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13 | Blocked By: 2, 3, 5

  **References**:
  - Pattern: `src/components/ui/table.tsx` — current table wrapper
  - Pattern: `src/components/ui/text-label.tsx` — current masked/copyable label behavior
  - Consumer: `src/components/accounts/AccountsTable.tsx` — primary table consumer
  - Consumer: `src/components/accounts/AccountDetails.tsx` — detail presentation using account fields
  - Consumer: `src/components/accounts/AccountRank.tsx` — rank display behavior
  - External: `https://mantine.dev/core/table/` — Mantine Table
  - External: `https://mantine.dev/core/scroll-area/` — Mantine ScrollArea
  - External: `https://mantine.dev/core/copy-button/` — Mantine CopyButton for `text-label` parity

  **Acceptance Criteria**:
  - [ ] Mantine-backed table and text-label implementations compile across current consumers
  - [ ] Copy/mask behavior is covered by tests
  - [ ] `bunx vitest run src/components/ui/text-label.test.tsx` passes
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Display seams preserve account value presentation behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/ui/table.test.tsx src/components/ui/text-label.test.tsx src/components/accounts/AccountDetails.test.tsx`
    Expected: Tests confirm table structural rendering, masked/copyable label behavior, and account detail rendering remain intact
    Evidence: .sisyphus/evidence/task-9-table-textlabel.txt

  Scenario: Consumer compatibility issues surface before accounts migration
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without broken table/text-label imports or account display prop mismatches
    Evidence: .sisyphus/evidence/task-9-table-textlabel-build.txt
  ```

  **Commit**: YES | Message: `refactor(ui): migrate table and text-label seams to mantine` | Files: `src/components/ui/table.tsx`, `src/components/ui/text-label.tsx`, related tests

- [ ] 10. Migrate auth and invite surfaces onto Mantine-backed shared seams

  **What to do**: Move the lower-risk user-facing surfaces to Mantine-backed primitives: login, signup, and invite flows; keep current validation, toast behavior, auth state updates, and invite acceptance logic intact; use this wave to confirm that the new shared field/action primitives are viable in real screens before the accounts area migration.
  **Must NOT do**: Do not redesign auth or invite information architecture; do not move auth logic out of current services/store contracts; do not couple this task to accounts-area rewrites.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: feature-surface migration using already-established shared seams
  - Skills: [`harden`] — helpful for preserving error/loading states during component swaps
  - Omitted: [`onboard`] — no onboarding/UX redesign work is intended

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 15 | Blocked By: 4, 5, 7

  **References**:
  - Consumer: `src/components/login-form.tsx` — login form behavior and toast usage
  - Consumer: `src/components/signup-form.tsx` — signup form behavior and validation usage
  - Consumer: `src/pages/Invite.tsx` — invite acceptance flow and loading/error handling
  - Pattern: `src/stores/AccountStore.ts` — auth/session fields used by these surfaces
  - Pattern: `src/hooks/use-toast.ts` — notification contract already stabilized by Task 4

  **Acceptance Criteria**:
  - [ ] `bunx vitest run src/components/login-form.test.tsx` passes
  - [ ] `bunx vitest run src/components/signup-form.test.tsx` passes
  - [ ] `bunx vitest run src/pages/Invite.test.tsx` passes
  - [ ] `bun run lint` passes
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Auth and invite flows preserve success/error behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/login-form.test.tsx src/components/signup-form.test.tsx src/pages/Invite.test.tsx`
    Expected: Tests confirm form submission states, error handling, toast emission, and invite flow rendering/edge cases behave as before
    Evidence: .sisyphus/evidence/task-10-auth-invite.txt

  Scenario: Shared primitive changes do not break lower-risk screens
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes with login, signup, and invite surfaces fully migrated to Mantine-backed shared seams
    Evidence: .sisyphus/evidence/task-10-auth-invite-build.txt
  ```

  **Commit**: YES | Message: `refactor(auth): migrate auth and invite surfaces to mantine` | Files: `src/components/login-form.tsx`, `src/components/signup-form.tsx`, `src/pages/Invite.tsx`, related tests

- [ ] 11. Decompose Accounts page into stable container and presentational boundaries

  **What to do**: Refactor `src/pages/Accounts.tsx` into a thinner orchestration container and extracted presentational or hook-level boundaries while preserving existing behavior; isolate grouping/filtering/selection orchestration, modal state, and data-loading coordination so the later UI migration tasks touch smaller units; keep all business contracts stable.
  **Must NOT do**: Do not migrate all account interactions in the same edit; do not move CRUD/sharing logic into a redesigned store API; do not alter route, query, or store semantics.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the main coupling hotspot and requires careful behavior-preserving decomposition
  - Skills: [] — repo-specific orchestration matters more than generic patterns
  - Omitted: [`architecture-patterns`] — avoid over-architecting a local refactor

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 12, 13, 14 | Blocked By: 4, 5

  **References**:
  - Pattern: `src/pages/Accounts.tsx` — current hotspot and orchestrator
  - Consumer: `src/components/accounts/AccountsHeader.tsx` — already extracted presentational seam
  - Consumer: `src/components/accounts/AccountsToolbar.tsx` — already extracted presentational seam
  - Consumer: `src/components/accounts/AccountsTable.tsx` — major dependent surface
  - Consumer: `src/components/accounts/useAccountSelection.ts` — logic seam needing compatibility
  - Pattern: `src/stores/AccountStore.ts` — data-loading and state contracts that must remain stable

  **Acceptance Criteria**:
  - [ ] `src/pages/Accounts.tsx` is materially smaller and delegates to extracted boundaries
  - [ ] `bunx vitest run src/pages/Accounts.container.test.tsx` passes
  - [ ] `bunx vitest run src/components/accounts/useAccountSelection.test.ts` continues to pass
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Accounts orchestration survives decomposition
    Tool: Bash
    Steps: Run `bunx vitest run src/pages/Accounts.container.test.tsx src/components/accounts/useAccountSelection.test.ts`
    Expected: Tests confirm extracted container logic still drives selection, filtering, and modal state correctly using existing store/service contracts
    Evidence: .sisyphus/evidence/task-11-accounts-decomposition.txt

  Scenario: Refactor-only decomposition does not create compile drift
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without broken imports, missing props, or changed store action signatures
    Evidence: .sisyphus/evidence/task-11-accounts-decomposition-build.txt
  ```

  **Commit**: YES | Message: `refactor(accounts): decompose accounts page orchestration` | Files: `src/pages/Accounts.tsx`, extracted account presenter/hook files, related tests

- [ ] 12. Migrate account modal and prompt workflows to Mantine-backed components

  **What to do**: Migrate `AddAccountDialog`, `InviteModal`, `SharingModal`, `NewGroupModal`, and `PasswordPrompt` to the Mantine-backed modal and field/select infrastructure; preserve submit/cancel behavior, default values, loading states, invite-sharing behavior, and password prompt semantics; split oversized modal content into smaller presentational pieces where it improves readability.
  **Must NOT do**: Do not redesign modal flows; do not alter encryption/share logic; do not move business logic into unrelated abstractions; do not change default group or current-password behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: modal and form migration with localized decomposition
  - Skills: [`harden`] — preserve error/loading/edge states while replacing the UI layer
  - Omitted: [`delight`] — no polish-only motion or flourish work is wanted

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 13, 15 | Blocked By: 4, 5, 6, 7, 11

  **References**:
  - Consumer: `src/components/AddAccountDialog.tsx` — largest dialog/form hotspot
  - Consumer: `src/components/accounts/InviteModal.tsx` — invite modal using select and loader states
  - Consumer: `src/components/accounts/SharingModal.tsx` — sharing management modal
  - Consumer: `src/components/accounts/NewGroupModal.tsx` — simple modal baseline
  - Consumer: `src/components/PasswordPrompt.tsx` — password prompt semantics
  - Pattern: `src/stores/AccountStore.ts` — store actions and state consumed by modal workflows

  **Acceptance Criteria**:
  - [ ] `bunx vitest run src/components/AddAccountDialog.test.tsx` passes
  - [ ] `bunx vitest run src/components/accounts/InviteModal.test.tsx` passes
  - [ ] `bunx vitest run src/components/accounts/SharingModal.test.tsx` passes
  - [ ] `bunx vitest run src/components/PasswordPrompt.test.tsx` passes
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Account modal workflows preserve form and prompt behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/AddAccountDialog.test.tsx src/components/accounts/InviteModal.test.tsx src/components/accounts/SharingModal.test.tsx src/components/PasswordPrompt.test.tsx`
    Expected: Tests confirm default values, validation errors, submit/cancel behavior, loading states, and password prompt flows remain intact
    Evidence: .sisyphus/evidence/task-12-account-modals.txt

  Scenario: Modal workflow migration does not break account feature compilation
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without modal prop, select contract, or store action mismatches
    Evidence: .sisyphus/evidence/task-12-account-modals-build.txt
  ```

  **Commit**: YES | Message: `refactor(accounts): migrate modal workflows to mantine` | Files: `src/components/AddAccountDialog.tsx`, `src/components/accounts/InviteModal.tsx`, `src/components/accounts/SharingModal.tsx`, `src/components/accounts/NewGroupModal.tsx`, `src/components/PasswordPrompt.tsx`, related tests

- [ ] 13. Migrate the accounts interaction surface to Mantine while preserving table and context-menu behavior

  **What to do**: Complete the highest-risk feature migration by moving `AccountsHeader`, `AccountsToolbar`, `AccountsTable`, `SelectionMenuContent`, `AccountDetails`, and related interaction code onto the Mantine-backed primitives established earlier; preserve row selection, right-click context-menu opening, bulk actions, filtering, rank displays, masked/copyable text display, and empty/loading states.
  **Must NOT do**: Do not simplify right-click behavior into a different interaction model; do not rewrite ranking/share logic; do not change account grouping/filter semantics; do not accept regressions hidden behind Mantine defaults.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the most coupled and behavior-sensitive part of the migration
  - Skills: [`harden`] — helps preserve edge/error/loading states during complex UI replacement
  - Omitted: [`optimize`] — performance work is not part of this pass

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 15 | Blocked By: 4, 5, 6, 7, 8, 9, 11, 12

  **References**:
  - Consumer: `src/components/accounts/AccountsHeader.tsx` — header-level actions
  - Consumer: `src/components/accounts/AccountsToolbar.tsx` — filters and bulk action controls
  - Consumer: `src/components/accounts/AccountsTable.tsx` — primary high-risk table and row-action surface
  - Consumer: `src/components/accounts/SelectionMenuContent.tsx` — submenu-driven actions
  - Consumer: `src/components/accounts/AccountDetails.tsx` — row detail rendering
  - Consumer: `src/components/accounts/AccountRank.tsx` — rank rendering and loading states
  - Pattern: `src/components/accounts/useAccountSelection.ts` — selection contract to preserve
  - Pattern: `src/pages/Accounts.tsx` — container boundary created in Task 11

  **Acceptance Criteria**:
  - [ ] `bunx vitest run src/components/accounts/AccountsTable.test.tsx` passes
  - [ ] `bunx vitest run src/components/accounts/AccountsToolbar.test.tsx` passes
  - [ ] `bunx vitest run src/components/accounts/SelectionMenuContent.test.tsx` passes
  - [ ] `bunx vitest run src/components/accounts/AccountDetails.test.tsx` passes
  - [ ] `bun run build` passes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Accounts interaction surface preserves critical behavior
    Tool: Bash
    Steps: Run `bunx vitest run src/components/accounts/AccountsTable.test.tsx src/components/accounts/AccountsToolbar.test.tsx src/components/accounts/SelectionMenuContent.test.tsx src/components/accounts/AccountDetails.test.tsx`
    Expected: Tests confirm right-click selects the target row before menu actions, bulk action menus render correctly, filters update visible rows, and detail/rank displays remain stable
    Evidence: .sisyphus/evidence/task-13-accounts-surface.txt

  Scenario: High-risk accounts migration compiles cleanly
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without broken table/menu/select integrations or invalid account-surface props
    Evidence: .sisyphus/evidence/task-13-accounts-surface-build.txt
  ```

  **Commit**: YES | Message: `refactor(accounts): migrate accounts interaction surface to mantine` | Files: `src/components/accounts/AccountsHeader.tsx`, `src/components/accounts/AccountsToolbar.tsx`, `src/components/accounts/AccountsTable.tsx`, `src/components/accounts/SelectionMenuContent.tsx`, `src/components/accounts/AccountDetails.tsx`, related tests

- [ ] 14. Internally decompose AccountStore while preserving the public store contract

  **What to do**: Refactor `src/stores/AccountStore.ts` into smaller internal modules by extracting types (`Account`, `AccountGroup`, parse helpers), master-key/decrypt helpers, owned/shared account loading helpers, and rank-loading helpers; keep the exported `useAccountStore` name, field names, action names, and observable behavior stable for all current consumers.
  **Must NOT do**: Do not introduce a new public slice API; do not rename or remove exported actions; do not move page-owned orchestration into the store; do not change logout semantics, legacy decrypt/migration-on-read behavior, or shared-account append behavior.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: public contract must stay stable while internals are reorganized
  - Skills: [] — the main need is careful contract preservation
  - Omitted: [`architecture-patterns`] — avoid turning this into a full state-management redesign

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 15 | Blocked By: 2, 11

  **References**:
  - Pattern: `src/stores/AccountStore.ts` — monolithic store to decompose
  - Consumer: `src/pages/Accounts.tsx` — main runtime consumer
  - Consumer: `src/components/login-form.tsx` — auth setter consumer
  - Consumer: `src/components/signup-form.tsx` — auth setter consumer
  - Consumer: `src/pages/Invite.tsx` — invite flow consumer
  - Consumer: `src/components/ProtectedRoute.tsx` — auth state guard consumer
  - Pattern: `src/services/AccountApi.ts` — CRUD/sharing/rank API boundary
  - Pattern: `src/services/GroupApi.ts` — groups API boundary
  - Pattern: `src/services/AuthApi.ts` — auth/logout boundary
  - Pattern: `src/utils/encryption.ts` — crypto helper boundary
  - Pattern: `src/utils/localStorageCache.ts` — rank cache helper boundary

  **Acceptance Criteria**:
  - [ ] `Account` and `AccountGroup` types no longer require UI components to import from the monolithic store file
  - [ ] `bunx vitest run src/stores/AccountStore.test.ts` passes
  - [ ] `bun run build` passes with existing consumers unchanged at the call-site contract level
  - [ ] `src/stores/AccountStore.ts` is materially smaller and delegates to extracted internal helpers

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Store contract remains stable after internal decomposition
    Tool: Bash
    Steps: Run `bunx vitest run src/stores/AccountStore.test.ts`
    Expected: Tests confirm auth setters, group loading, owned/shared account loading, rank updates, and logout behavior still follow the existing public contract
    Evidence: .sisyphus/evidence/task-14-account-store.txt

  Scenario: Type and import coupling regressions are caught
    Tool: Bash
    Steps: Run `bun run build`
    Expected: Build passes without consumer import breaks or changed action/state signatures
    Evidence: .sisyphus/evidence/task-14-account-store-build.txt
  ```

  **Commit**: YES | Message: `refactor(store): extract account store internals without api changes` | Files: `src/stores/AccountStore.ts`, extracted helper/type files, store tests, impacted type imports

- [ ] 15. Remove obsolete shadcn, Radix, next-themes, and Tailwind UI residue after parity is reached

  **What to do**: After all targeted surfaces are migrated and passing verification, remove no-longer-used UI wrappers, obsolete dependencies, and transitional theme plumbing; eliminate remaining old-stack imports from migrated surfaces; remove `next-themes` only when Mantine-backed color-scheme handling is fully in place; keep any non-UI Tailwind residue only if still actively required outside the migrated seam set.
  **Must NOT do**: Do not remove dependencies or wrappers still used by any remaining code; do not broaden this into a repo-wide CSS redesign; do not delete migration-era compatibility code until all tests and builds pass.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: residue cleanup must be exact and low-risk after many earlier changes
  - Skills: [] — precise repo cleanup matters more than generic skill guidance
  - Omitted: [`distill`] — this is dependency/residue removal, not aesthetic simplification

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final verification | Blocked By: 10, 12, 13, 14

  **References**:
  - Pattern: `src/components/ui/` — old wrapper directory to prune carefully
  - Pattern: `src/components/theme-provider.tsx` — transitional theme bridge to remove only if unused
  - Pattern: `src/index.css` — remove only obsolete old-stack token/residue, not needed global styles
  - Pattern: `package.json` — dependency cleanup target
  - Pattern: `bun.lock` — lockfile refresh after cleanup
  - Consumer: `src/main.tsx` — final provider/root composition

  **Acceptance Criteria**:
  - [ ] `bun run lint` passes
  - [ ] `bun run build` passes
  - [ ] `bunx vitest run` passes
  - [ ] `package.json` no longer includes unused shadcn/Radix/next-themes packages
  - [ ] migrated app surfaces no longer import obsolete wrapper modules

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Cleanup leaves a fully working Mantine-based codebase
    Tool: Bash
    Steps: Run `bunx vitest run`; then run `bun run lint`; then run `bun run build`
    Expected: All verification commands pass after cleanup and no removed dependency is still required
    Evidence: .sisyphus/evidence/task-15-old-stack-cleanup.txt

  Scenario: Residual old-stack usage is detected before commit
    Tool: Bash
    Steps: Run `powershell -Command "Get-ChildItem -Recurse src -Include *.ts,*.tsx | Select-String -Pattern '@radix-ui|next-themes'"`
    Expected: No remaining imports exist in migrated surfaces; any intentional residue is explicitly documented and not accidental
    Evidence: .sisyphus/evidence/task-15-old-stack-cleanup-search.txt
  ```

  **Commit**: YES | Message: `chore(ui): remove obsolete shadcn radix and theme residue` | Files: `package.json`, `bun.lock`, removed wrapper files, theme residue, updated imports

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Keep commits wave-scoped and atomic.
- Run `bun run lint`, `bun run build`, and relevant `bunx vitest run ...` commands before each commit.
- Preferred sequence:
  1. `chore(deps): upgrade react and mantine prerequisites`
  2. `test(ui): add characterization coverage for critical seams`
  3. `refactor(app): add mantine provider and compatibility adapters`
  4. `refactor(ui): migrate shared primitives to mantine`
  5. `refactor(auth): migrate auth and invite surfaces`
  6. `refactor(accounts): decompose pages and migrate modal workflows`
  7. `refactor(accounts): migrate table and context interactions`
  8. `refactor(store): extract account store internals`
  9. `chore(ui): remove obsolete shadcn radix and theme residue`

## Success Criteria
- Mantine 9 is the active UI system across the app’s existing surfaces
- Existing flows remain intact for login, signup, invite acceptance, account CRUD, sharing, rank loading, and account table actions
- Monolithic files are decomposed into clearer boundaries without changing business behavior
- `useAccountStore` callers continue to function without public API changes
- Notification, modal, select, and context-menu behavior is explicitly verified rather than assumed
- Old UI infrastructure is removed only after the migrated flow set is passing verification
