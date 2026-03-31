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
- Spring Boot bot-player backend in `backend/`
- CI quality gates in GitHub Actions
- Custom Copilot agents for organized feature delivery

## Bot Player

The game now supports one human player and three bot players.

- Human player: seat 0 (UI-controlled)
- Bot players: seats 1-3 (server-controlled via heuristic strategy)
- Bot behavior is resolved by the backend and synced back to the frontend game state

## Local Development Setup

```powershell
npm install
npm run lint     # Check code style
npm run test     # Run unit tests
npm run test:ci  # Run tests with coverage report
```

### Backend Setup

Start the Spring Boot backend in dev mode:

```powershell
mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=dev
```

The backend runs with CORS configured for localhost development.

### API Quick Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/games` | Create a new game session (human + bots) |
| GET | `/api/games/{id}` | Get current game state by session ID |
| POST | `/api/games/{id}/play` | Play a card for the active seat and resolve bot turns |
| POST | `/api/games/{id}/new-round` | Start a new round using the existing session |

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
│   ├── apiClient.js        # Backend API client (create/get/play/new-round)
│   ├── botOrchestrator.js  # Bot reveal/turn animation sequencer
│   └── style.css           # Game UI styling
├── backend/
│   ├── src/main/java/      # Spring Boot REST API + bot strategy + session store
│   └── src/test/java/      # Backend unit and slice tests
├── tests/
│   ├── gameRules.test.js   # Unit tests for game rules
│   ├── game.test.js        # Integration tests for game controller
│   ├── apiClient.test.js   # API client behavior tests
│   └── botOrchestrator.test.js # Bot animation sequencing tests
├── scripts/
│   ├── feature-orchestrator.ps1    # Create feature branch and issue
│   ├── create-pr.ps1               # Open pull request
│   └── wait-quality-gates.ps1      # Monitor CI status
├── docs/
│   ├── local-agent-mode.md         # Multi-agent workflow guide
│   └── ux/
│       └── Sauspiel_UX_Brief.md    # UX design documentation
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

## Continuous Integration

**CI Pipeline** (`.github/workflows/ci.yml`):
- ✅ Frontend: ESLint + Jest tests
- ✅ Backend: Maven verify (`mvn -f backend/pom.xml verify`)
- ✅ Code coverage and quality gates

Current automated coverage includes 54 JavaScript tests and 27 Java tests.

