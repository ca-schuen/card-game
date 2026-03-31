# Card Game Agent Workflow

## Goal
This repository is configured for a comprehensive multi-agent delivery flow:
1. Organizer agent receives a feature prompt.
2. Requirements Engineer researches and documents detailed requirements.
3. Software Architect analyzes design alternatives and documents decisions.
4. Organizer creates a GitHub issue with full context.
5. Feature Planner breaks down work into tasks.
6. Specialist agents implement (Frontend/Backend), test (TDD), and document (Technical Author).
7. Organizer opens a pull request.
8. Ops CI Engineer monitors GitHub Actions health, analyzes failures, and posts diagnostics to PR.
9. Organizer handles merge once CI passes.

## Required Sequence For Feature Work
1. Start from the `Organizer` custom agent.
2. Delegate to `Requirements Engineer` to research and document detailed requirements in the issue.
3. Delegate to `Software Architect` to research design alternatives and document architecture decisions.
4. Run `scripts/feature-orchestrator.ps1 -Feature "<feature prompt>"` to create branch and issue metadata.
5. Delegate to `Feature Planner` to break requirements into actionable tasks.
6. Delegate to `Frontend Developer` and/or `Backend Developer` following the architecture design.
7. Delegate to `TDD Engineer` to design and implement test coverage.
8. Ensure `npm run lint` and `npm run test` pass locally.
9. Delegate to `Technical Author` to update all documentation.
10. Create PR with `scripts/create-pr.ps1 -Issue <id> -Title "<title>"`.
11. Delegate to `Ops CI Engineer` to monitor GitHub Actions, analyze failures, and post diagnostics to PR.
12. If CI fails, Ops CI Engineer posts detailed error analysis and remediation steps as PR comments.
13. Once all CI checks pass, organizer handles merge or retest.


## Code Standards
- Keep frontend code in `src/` and tests in `tests/`.
- Use plain JavaScript and browser APIs for frontend game logic.
- Write deterministic unit tests for game rules.
- Prefer small, focused commits linked to an issue.
- Follow architecture design decisions documented by Software Architect.
- Document all significant design decisions and trade-offs.

## Backend Transition
When Spring Boot backend work begins:
- Place backend in `backend/`.
- Add Maven tests and include backend verification in CI.
- Keep API contracts documented in `docs/`.
- Follow architecture design for backend services and APIs.
