# Local Agent Mode Runbook

## Objective
Provide one organizer/planner-led flow that drives a feature from prompt to approved PR with mandatory quality gates.
Also support a correction loop for post-PR bugs or quality concerns without restarting intake.

## Agent Roles

- Organizer: intake prompt, create issue, orchestrate all roles, open PR only when green.
- Feature Planner: convert prompt to scoped plan and acceptance criteria.
- Frontend Developer: implement browser-side game work in `src/`.
- Backend Developer: implement Spring Boot work in `backend/`.
- TDD Engineer: create or update tests for all behavior changes.
- Ops CI Engineer: maintain and validate lint/test pipeline and check status.

## Required Workflow

1. Start with Organizer agent.
2. Run:
   ```powershell
   ./scripts/feature-orchestrator.ps1 -Feature "<feature summary>"
   ```
3. Delegate planning and implementation tasks.
4. Ensure tests are added/updated before finalizing implementation.
5. Run quality gates locally:
   ```powershell
   npm run lint
   npm run test
   mvn -f backend/pom.xml verify
   ```
6. Push branch and validate GitHub checks.
7. Create pull request:
   ```powershell
   ./scripts/create-pr.ps1 -Issue <issue-number> -Title "<title>"
   ```
8. Optionally block until checks complete:
   ```powershell
   ./scripts/wait-quality-gates.ps1 -PullRequestNumber <pr-number>
   ```

## Post-PR Correction Workflow

Use this when a PR branch is checked out and you discover a bug or quality gap after `/new-feature-flow`.

1. Start Organizer using `/pr-bugfix-flow` and describe concerns.
2. Organizer converts concerns into acceptance criteria deltas.
3. Reproduce issue and apply targeted fix on the current branch.
4. Delegate test updates to TDD Engineer.
5. Run local quality gates:
   ```powershell
   npm run lint
   npm run test
   mvn -f backend/pom.xml verify
   ```
6. Validate CI/check status before requesting merge.

## Feature Intake Options

- Primary: ask Organizer agent directly in chat.
- Prompt shortcut: `/new-feature-flow`.
- Post-PR fix shortcut: `/pr-bugfix-flow`.
- Optional automation: run GitHub workflow `Feature Intake` with `feature_prompt` input to auto-create an issue.

## Branching and Traceability Rules

- Feature branch pattern: `feature/YYYYMMDD-slug`
- PR body must include `Closes #<issue>`.
- Every acceptance criterion must map to at least one test.

## Quality Gates

GitHub Actions in `.github/workflows/ci.yml` enforces:
- Frontend lint.
- Frontend tests.
- Backend verify.

PRs should only be approved after all required checks pass.
