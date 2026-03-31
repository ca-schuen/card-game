# Card Game Agent Workflow

## Goal
This repository is configured for a local multi-agent delivery flow:
1. Organizer agent receives a feature prompt.
2. Organizer creates a GitHub issue.
3. Organizer delegates to specialist subagents (planning, frontend/backend implementation, TDD, ops/CI).
4. Quality gates pass in CI.
5. Organizer opens a pull request for human approval.

## Required Sequence For Feature Work
1. Start from the `Organizer` custom agent.
2. Run `scripts/feature-orchestrator.ps1` first to create branch + issue metadata.
3. Delegate implementation tasks to specialist agents.
4. Ensure tests are written before or with implementation changes.
5. Ensure `npm run lint` and `npm run test` pass locally.
6. Ensure CI passes on the pull request.
7. Create PR with `scripts/create-pr.ps1`.

## Code Standards
- Keep frontend code in `src/` and tests in `tests/`.
- Use plain JavaScript and browser APIs for frontend game logic.
- Write deterministic unit tests for game rules.
- Prefer small, focused commits linked to an issue.

## Backend Transition
When Spring Boot backend work begins:
- Place backend in `backend/`.
- Add Maven tests and include backend verification in CI.
- Keep API contracts documented in `docs/`.
