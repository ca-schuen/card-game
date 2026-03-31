# UX Design Brief: Dynamic CI Smoke Tests

## Feature Scope
Add CI smoke tests that:
- Start frontend and backend services in CI.
- Run two end-to-end game sessions.
- Validate expected error handling paths.
- Detect and classify unexpected errors with clear diagnostics.

This feature has no direct player-facing UI impact. The UX surface is developer/operator experience in CI logs, check summaries, and triage workflow.

## User Journey Map

### Personas
- Developer opening a PR and validating smoke checks.
- Reviewer/operator diagnosing CI failures quickly.

### Entry Points
- GitHub PR checks list.
- Commit status checks on push.
- Optional local follow-up using `scripts/wait-quality-gates.ps1`.

### Happy Path
1. User opens PR checks and sees a dedicated smoke check (for example, `smoke-e2e`).
2. Check transitions from queued to in progress with visible step names:
   - `Boot backend`
   - `Boot frontend`
   - `Wait for health`
   - `Run game 1`
   - `Run game 2`
   - `Validate expected errors`
   - `Assert no unexpected errors`
   - `Publish smoke summary`
3. User opens job summary and sees:
   - Overall result: pass/fail.
   - Two-game matrix (Game 1, Game 2) with duration and outcome.
   - Expected error assertions status.
   - Link or section anchor to failure diagnostics when failed.
4. User closes tab without additional action when green.

### Error Paths
1. Service startup failure:
   - Backend or frontend does not become healthy before timeout.
   - Summary displays root phase, timeout threshold, and last health probe response.
2. Test runner failure:
   - Runner cannot execute second game due to setup or network issue.
   - Summary marks run as infrastructure/setup failure, not gameplay assertion failure.
3. Expected error mismatch:
   - Expected failure path did not occur or mismatch in error code/message pattern.
   - Summary labels as contract regression and highlights expected vs observed.
4. Unexpected runtime error:
   - Unhandled exception, process crash, or unknown response format.
   - Summary labels as unexpected error and points to first error timestamp and step.

### Edge Cases
- First game passes, second game fails intermittently.
- Backend starts but fails after first game.
- Frontend serves stale build or startup races with backend readiness.
- Logs contain multiple errors; only first causal error should be highlighted in summary while preserving full logs.

### Exit Points
- Green: merge flow continues.
- Red: user follows triage flow to identify owner area (infra/test/game logic/API contract) and files a targeted fix.

## Interaction Specifications

### Primary Interaction: PR Check Review
- Click smoke check from PR checks list.
- Default view lands on step list and live logs.
- After completion, user opens job summary panel.
- Time expectations:
  - Service boot feedback should appear within 10 seconds.
  - Health-wait phase should report retry cadence (for example every 2 seconds).
  - Total smoke execution target under 3 minutes.

### Secondary Interaction: Failure Triage
- User clicks failed step in timeline.
- User jumps to nearest `SMOKE_DIAG` marker in logs.
- User reads standardized diagnostics block:
  - `Failure Type`: `startup-timeout | expected-error-mismatch | unexpected-error | test-runner-error`
  - `Failed Phase`
  - `Game Id`
  - `Correlation Id`
  - `Suggested Owner`
  - `Suggested Next Command`
- User follows suggested next command locally (if needed) and posts concise findings on PR.

### Interaction Rules
- No primary user action should exceed 3 steps:
  - Detect failure -> Open summary -> Jump to diagnostics.
- Step names must be stable and action-oriented so users can scan quickly.
- Any retry behavior should print count and elapsed time.

## Feedback and States

### CI Smoke Check State Model
- `Queued`: check created; summary shows pending icon.
- `Initializing`: services booting; logs stream readiness probes.
- `Running`: game simulations executing; per-game progress updates.
- `Validating`: expected/unexpected error assertions running.
- `Success`: all smoke scenarios pass.
- `Failure`: one or more classified failures.
- `Cancelled`: run superseded or manually cancelled.

### Required Feedback by Interactive Element
- Check tile in PR UI:
  - Loading: spinning status with current phase text.
  - Success: green with duration and two-game pass count.
  - Error: red with failure type label.
  - Disabled: not applicable in GitHub UI (system-managed).
- Job summary:
  - Empty: if summary generation fails, show fallback message and link to raw logs.
  - Success: compact matrix and no-action message.
  - Error: top-level failure card with triage checklist.
- Log stream:
  - Loading: immediate first line within 10 seconds.
  - Error: explicit banner line when parser cannot classify failure.

## Accessibility Checklist (WCAG 2.1 AA-aligned)
- Use plain-text semantic headings in job summary (H1/H2 style markdown) for screen reader navigation.
- Avoid color-only status indicators; include explicit labels (`PASS`, `FAIL`, `UNEXPECTED ERROR`).
- Keep diagnostic IDs and commands copyable as plain text.
- Ensure log markers use consistent prefixes (`SMOKE_PHASE`, `SMOKE_DIAG`) for assistive search and keyboard find.
- Maintain sufficient contrast in any generated markdown tables (text-only fallback if rendering strips styles).
- Keep summary wording concise to reduce cognitive load during incident triage.

## Responsive Considerations
Mobile-first applies to PR web and app views where logs are narrow:
- Place result headline first, then short bullet triage checklist.
- Keep per-game results in a 2-column max table; collapse extra details into short lines.
- Keep diagnostic keys short to prevent horizontal scrolling.
- Provide one-line copyable rerun command for small screens.

## Interaction Flow: Reading Smoke Results and Diagnosing Failures
1. Open PR and inspect check status.
2. Select failed or completed smoke check.
3. Read summary header for failure classification.
4. If failed, use triage checklist:
   - Confirm failed phase.
   - Confirm whether failure is expected-error mismatch or unexpected error.
   - Confirm whether issue is startup/infrastructure vs gameplay/API.
5. Jump to first `SMOKE_DIAG` block in logs.
6. Capture correlation id, game id, and suggested owner.
7. Run suggested local reproduction command if needed.
8. Post PR comment with classification, probable owner, and next action.

## Open Questions Resolved
- No critical ambiguities block this UX brief.
- Assumption A: CI implementation can emit standardized log prefixes and markdown job summary.
- Assumption B: Two games are deterministic enough to classify failures reliably.
- Assumption C: Existing CI check naming can be updated to include a dedicated smoke job.

## Revision Notes
Before:
- UX docs only described generic brief structure and player-facing conventions.
- CI quality gates lacked an explicit developer/operator UX definition for smoke triage readability.

After:
- Added a CI-focused UX brief defining failure readability, log taxonomy, summary structure, and triage flow.
- Confirmed no direct player-facing UI changes are required for this feature.

## Handoff Notes
- Frontend/Backend Developer: implement stable log markers and summary schema exactly as specified.
- TDD Engineer: add assertions that summary includes failure type, phase, and diagnostics for each failure class.
- Ops CI Engineer: verify job naming, step order, and summary rendering quality in GitHub Actions.
- Technical Author: include a screenshot or text sample of pass/fail smoke summary in project docs if workflow changes become persistent process guidance.
