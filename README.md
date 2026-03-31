# Card Game Repository

This repository is prepared for a local multi-agent development flow with:
- Frontend card game code in `src/`
- Tests in `tests/`
- Future Spring Boot backend in `backend/`
- CI quality gates in GitHub Actions
- Custom Copilot agents for organized feature delivery

## Local Setup

```powershell
npm install
npm run lint
npm run test
```

## Full Local Agent Mode

Use the `Organizer` custom agent and give it your feature prompt. The expected sequence is:
1. Create branch + issue.
2. Produce implementation plan.
3. Delegate frontend/backend work.
4. Add tests (TDD-focused).
5. Validate CI and quality gates.
6. Open PR for approval.

Detailed runbook: `docs/local-agent-mode.md`

## Scripts

- `scripts/feature-orchestrator.ps1 -Feature "<feature prompt>"`
- `scripts/create-pr.ps1 -Issue <issue-number> -Title "<pr-title>"`
- `scripts/wait-quality-gates.ps1 -PullRequestNumber <pr-number>`

## CI

Workflow: `.github/workflows/ci.yml`
- Frontend: lint + test
- Backend (when `backend/pom.xml` exists): Maven verify
