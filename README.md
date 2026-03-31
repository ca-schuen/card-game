# Card Game Repository

This repository contains a **Sauspiel** card game implementation with a web-based UI and a multi-agent development flow.

## Sauspiel Game

**Sauspiel** is a traditional Bavarian trick-taking card game played with 4 players using a 32-card German suited deck.

### Game Rules (MVP Version)

- **Players**: 4 (local pass-and-play)
- **Deck**: 32 cards (7-Ace, 4 German suits: Eichel, Gras, Herz, Schellen)
- **Objective**: First team/player to reach **61 points** wins the round. First to win **3 rounds** wins the game.

### How to Play

1. **Dealing**: Each player receives 8 cards
2. **Bidding Phase**: Players bid or pass. First to bid is the "Sauer" (solo player)
3. **Trick-Taking**: Players play one card per round, following suit or playing trump
   - **Trump Suit**: Hearts (Herz) in Sauspiel
   - **Trump Ranks**: All Obers and Unters are always trump
   - **Card Values**: A=11pts, 10=10pts, K=4pts, O=3pts, U=2pts, others=0pts
4. **Scoring**: Collect tricks worth 61+ points to win the round
5. **Victory**: First player/team to win 3 rounds wins the game

### Playing the Game

Open `index.html` in a web browser and follow the on-screen prompts:
- Click **New Game** to start
- During bidding: Click **Bid Sauspiel** or **Pass**
- During play: Click cards in your hand to play them
- The game automatically resolves tricks and updates scores

## Repository Structure

This repository is prepared for a local multi-agent development flow with:
- Frontend card game code in `src/`
- Tests in `tests/`
- Future Spring Boot backend in `backend/`
- Dynamic smoke CI helpers in `scripts/ci/`
- CI quality gates in GitHub Actions
- Custom Copilot agents for organized feature delivery

## Local Development Setup

```powershell
npm install
npm run lint     # Check code style
npm run test     # Run unit tests
npm run test:ci  # Run tests with coverage report
```

### Running the Game

1. Open `index.html` in a modern web browser
2. Click "New Game" to start playing
3. Follow on-screen prompts for bidding and card play

## File Structure

```
card-game/
├── index.html              # Game UI entry point
├── src/
│   ├── gameRules.js        # Core game logic (32-card deck, rules, scoring)
│   ├── game.js             # Game controller (UI binding, state management)
│   └── style.css           # Game UI styling
├── tests/
│   ├── gameRules.test.js   # Unit tests for game rules
│   └── game.test.js        # Integration tests for game controller
├── scripts/
│   ├── feature-orchestrator.ps1    # Create feature branch and issue
│   ├── create-pr.ps1               # Open pull request
│   ├── wait-quality-gates.ps1      # Monitor CI status
│   └── ci/                         # Smoke CI helpers and policy
├── docs/
│   ├── local-agent-mode.md         # Multi-agent workflow guide
│   └── ux/
│       └── dynamic-ci-smoke-tests-ux-brief.md  # UX design documentation for smoke tests
└── .github/
    ├── agents/                     # Custom CodeLM agents
    ├── prompts/                    # Feature prompts
    └── workflows/                  # CI/CD pipeline


## Development Workflow

This project uses a multi-agent development flow. Use the `Organizer` custom agent with your feature prompt:

```powershell
# Example: Start a new feature
"Create a new feature: [your description]"
```

**Workflow sequence:**
1. Organizer creates branch and issue
2. Requirements Engineer documents detailed requirements
3. Software Architect analyzes design alternatives
4. UI/UX Designer produces UX brief
5. Featured Planner breaks down tasks
6. Frontend/Backend Developers implement
7. TDD Engineer validates test coverage
8. Technical Author updates docs
9. Ops CI Engineer monitors quality gates
10. Organizer opens PR

**Prompt shortcuts:**
- `/new-feature-flow`: Full feature delivery from intake to PR.
- `/pr-bugfix-flow`: Post-PR correction loop when you checked out a PR branch and found bugs or quality gaps.

See `docs/local-agent-mode.md` for detailed runbook.

## Feature Development Scripts

```powershell
# Create feature branch and GitHub issue
scripts/feature-orchestrator.ps1 -Feature "<feature description>"

# Create pull request
scripts/create-pr.ps1 -Issue <issue-number> -Title "<pr-title>"

# Monitor CI quality gates
scripts/wait-quality-gates.ps1 -PullRequestNumber <pr-number>
```

### Smoke CI Scripts

- `scripts/ci/healthcheck.js`: Waits for backend health and writes `artifacts/smoke/healthcheck.json`.
- `scripts/ci/play-two-games.js`: Runs game simulation calls against backend endpoints and records diagnostics.
- `scripts/ci/smoke-runner.js`: Orchestrates smoke validation and enforces expected/unexpected error gates.
- `scripts/ci/expected-errors.policy.json`: Policy contract for allowed statuses/message patterns and required pass/error thresholds.

## Continuous Integration

**CI Pipeline** (`.github/workflows/ci.yml`):
- ✅ Frontend: ESLint + Jest tests
- ✅ Backend (when `backend/pom.xml` exists): Maven verify
- ✅ Backend-conditional smoke job (only when `backend/pom.xml` exists)
- ✅ Code coverage and quality gates

### Dynamic Smoke CI Flow (Issue #11)

The `smoke-e2e` job is a lightweight runtime check that:
1. Boots backend and frontend services.
2. Waits for backend health (`Wait for health` phase).
3. Runs 2 game simulations (`Run game 1` and `Run game 2`).
4. Validates expected errors using `scripts/ci/expected-errors.policy.json`.
5. Fails on unexpected errors and publishes a smoke summary artifact.

The smoke job is backend-conditional and only runs when `backend/pom.xml` is present.

### Run Smoke Locally

Start backend and frontend (same as CI intent), then run:

```powershell
npm run smoke:ci
```

`npm run smoke:ci` runs `scripts/ci/smoke-runner.js`, which performs healthcheck, executes two games, and enforces expected/unexpected error gating from `scripts/ci/expected-errors.policy.json`.

