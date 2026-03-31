# Local Agent Mode Runbook

## Objective
Provide one organizer/planner-led flow that drives a feature from prompt to approved PR with mandatory quality gates.

## Agent Roles

- Organizer: intake prompt, create issue, orchestrate all roles, open PR only when green.
- Feature Planner: convert prompt to scoped plan and acceptance criteria.
- Frontend Developer: implement browser-side game work in `src/`.
- Backend Developer: implement Spring Boot work in `backend/` (when applicable).
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

## Feature Intake Options

- Primary: ask Organizer agent directly in chat.
- Optional automation: run GitHub workflow `Feature Intake` with `feature_prompt` input to auto-create an issue.

## Branching and Traceability Rules

- Feature branch pattern: `feature/YYYYMMDD-slug`
- PR body must include `Closes #<issue>`.
- Every acceptance criterion must map to at least one test.

## Quality Gates

GitHub Actions in `.github/workflows/ci.yml` enforces:
- Frontend lint.
- Frontend tests.
- Backend verify (auto-enabled when `backend/pom.xml` exists).

PRs should only be approved after all required checks pass.
