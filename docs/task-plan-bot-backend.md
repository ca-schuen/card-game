# Task Plan: Spring Boot Backend with Bot-Player Logic

## 1. Scope summary
Build a production-ready v1 backend in `backend/` for Schafkopf gameplay authority, bot automation, and session lifecycle, then integrate the frontend with API-driven state transitions and bot reveal UX.

Delivered scope includes:
- Spring Boot 3.x + Java 21 Maven service with in-memory sessions and strict rules enforcement.
- Java game engine parity with existing `src/gameRules.js` behavior.
- Pluggable bot strategy (`BotStrategy`) with default heuristic implementation.
- REST API for game creation, state retrieval, card play with bot auto-resolution, and new round flow.
- Frontend integration (API client, state machine, bot animation, accessibility live regions).
- Full automated verification (unit + integration tests, CI updates) and documentation refresh.

## 2. Acceptance criteria list
- Backend endpoints return correct, validated JSON and never expose bot hands.
- Server enforces Folgepflicht, trump ranking, trick resolution, and score rules with deterministic behavior under tests.
- Human card play triggers automatic bot moves until next human turn or round completion.
- Frontend transitions through required states and presents sequential bot reveal timing (600 ms initial delay, 400 ms stagger, card flip animation).
- Accessibility announcements are present and meaningful for turn, bot action, trick result, round result, and errors.
- CI runs both JS and Maven quality gates successfully.

## 3. Work breakdown by area

### Backend foundation and domain
- [ ] **T01** - Maven Backend Bootstrap (`backend/pom.xml`, package skeleton)
  - **Owner**: Backend Developer
  - **Dependencies**: None
  - **Acceptance criteria**:
    - `backend/pom.xml` targets Java 21 and includes Spring Boot, validation, test, Mockito, and MockMvc dependencies.
    - Directory/package structure exists under `com.cardgame.backend` with `model`, `engine`, `bot`, `session`, `api`, `config`.
    - `mvn -f backend/pom.xml verify` executes successfully with placeholder app/tests.
  - **Risk**: low - Standard Spring Boot scaffold.

- [ ] **T02** - Domain Model Implementation (`model` package)
  - **Owner**: Backend Developer
  - **Dependencies**: T01
  - **Acceptance criteria**:
    - Implement `Card`, `GameSession`, `GameState`, `GameType`, `PlayRequest`, `PlayResponse` with immutability/validation where appropriate.
    - Model supports hidden bot hands and client-visible projections.
    - Invalid game setup combinations (for example SOLO without suit) are rejected at model/service boundary.
  - **Risk**: medium - Model mistakes propagate across engine and API.

- [ ] **T03** - Java Engine Port from `gameRules.js` (`engine` package)
  - **Owner**: Backend Developer
  - **Dependencies**: T02
  - **Acceptance criteria**:
    - Implement `TrumpEvaluator`, `TrickResolver`, `DeckFactory`, `GameEngine` with rule parity against JS logic.
    - Engine provides legal-card validation, trick winner resolution, trick point scoring, and round completion detection.
    - Deterministic mode (seeded shuffle or injectable RNG) exists for tests.
  - **Risk**: high - Rule parity regressions are likely without strict test vectors.

### Bot and session orchestration
- [ ] **T04** - Bot Strategy Abstraction and Heuristic Bot
  - **Owner**: Backend Developer
  - **Dependencies**: T03
  - **Acceptance criteria**:
    - Define `BotStrategy` interface with explicit legality contract.
    - Implement `HeuristicBotStrategy` for lead/follow decisions and partner-aware behavior in Sauspiel.
    - Bot always returns a legal card from its own hand.
  - **Risk**: medium - Heuristic edge cases can produce weak or unintuitive play.

- [ ] **T05** - In-Memory Session Store (`session` package)
  - **Owner**: Backend Developer
  - **Dependencies**: T02
  - **Acceptance criteria**:
    - Implement `InMemorySessionStore` using thread-safe storage keyed by session id.
    - Support create/read/update/delete and last-access tracking.
    - Expired sessions (30 min inactivity) are evicted and surfaced as gone/expired behavior.
  - **Risk**: medium - Expiry and concurrency defects are subtle.

- [ ] **T06** - Game Service Orchestration Layer
  - **Owner**: Backend Developer
  - **Dependencies**: T03, T04, T05
  - **Acceptance criteria**:
    - Service composes engine + bot + session to run: create game, get state, play human card, resolve bots, start next round.
    - Out-of-turn and illegal-card plays are rejected with domain exceptions.
    - Returned state includes only client-safe fields and sufficient data for frontend animation sequencing.
  - **Risk**: high - Most cross-component regressions concentrate here.

### API and platform config
- [ ] **T07** - REST Controller (`api/GameController`)
  - **Owner**: Backend Developer
  - **Dependencies**: T06
  - **Acceptance criteria**:
    - Implement endpoints: `POST /api/games`, `GET /api/games/{id}`, `POST /api/games/{id}/play`, `POST /api/games/{id}/new-round`.
    - Request validation and status codes follow contract (`400`, `404/410`, `409`, `422` as applicable).
    - Response DTOs never include bot hands.
  - **Risk**: medium - Contract mismatch can break frontend integration.

- [ ] **T08** - Cross-Cutting Config (`config/CorsConfig`, `config/GlobalExceptionHandler`)
  - **Owner**: Backend Developer
  - **Dependencies**: T07
  - **Acceptance criteria**:
    - CORS allows configured frontend origins and methods in non-dev profiles.
    - Global exception mapping returns structured JSON error payloads without stack traces.
    - Validation and domain errors map consistently to intended HTTP codes.
  - **Risk**: low - Mostly framework wiring.

### Backend verification
- [ ] **T09** - Backend Unit Tests (JUnit 5 + Mockito)
  - **Owner**: TDD Engineer
  - **Dependencies**: T03, T04, T05, T06
  - **Acceptance criteria**:
    - Unit tests cover engine rules, bot move legality/heuristics, session TTL behavior, and service orchestration branches.
    - Deterministic test fixtures assert exact trick winners and bot card selections.
    - Coverage target for backend logic classes is met (excluding config/DTO boilerplate).
  - **Risk**: medium - Determinism and fixture quality drive confidence.

- [ ] **T10** - Backend Integration Tests (MockMvc + `@SpringBootTest`)
  - **Owner**: TDD Engineer
  - **Dependencies**: T07, T08
  - **Acceptance criteria**:
    - End-to-end HTTP tests verify create -> play -> bot resolve -> state retrieval -> new round flow.
    - Error-path tests validate conflict, unprocessable entity, and expired session responses.
    - Serialization contract tests assert hidden bot-hand fields are absent.
  - **Risk**: medium - Test brittleness if payload contracts drift.

### Frontend integration and UX behavior
- [ ] **T11** - API Client Module (`src/apiClient.js`)
  - **Owner**: Frontend Developer
  - **Dependencies**: T07, T08
  - **Acceptance criteria**:
    - Implement typed helper methods for game creation, state fetch, play, and new-round calls.
    - Normalize backend error payloads to frontend-consumable error objects.
    - Includes timeout/network failure handling strategy used by UI flow.
  - **Risk**: low - Mostly request/response mapping.

- [ ] **T12** - UI State Machine + Bot Reveal Animation (`src/game.js` or extracted module)
  - **Owner**: Frontend Developer
  - **Dependencies**: T11
  - **Acceptance criteria**:
    - State machine implements: `idle -> game-creating -> human-turn -> submitting -> bots-resolving -> trick-complete -> round-complete`.
    - Bot card reveal sequence is 600 ms initial delay + 400 ms per bot with card flip animation.
    - UI remains interactive only during valid human-turn windows; submitting/resolving states lock hand input.
  - **Risk**: high - Timing and async race conditions can create visible UX defects.

- [ ] **T13** - Accessibility Live Regions + Keyboard/Focus Behavior
  - **Owner**: Frontend Developer
  - **Dependencies**: T12
  - **Acceptance criteria**:
    - Add 5 persistent aria-live regions for turn status, bot action, trick result, round result, and errors.
    - Playable card controls expose correct accessibility labels and disabled state semantics.
    - Focus moves to first playable card when entering human-turn and to retry/new-game controls on errors.
  - **Risk**: medium - Accessibility regressions often go unnoticed without explicit testing.

### Frontend and pipeline verification
- [ ] **T14** - Frontend Tests (`tests/apiClient.test.js`, `tests/botFlow.test.js`)
  - **Owner**: TDD Engineer
  - **Dependencies**: T11, T12, T13
  - **Acceptance criteria**:
    - API client tests mock HTTP behavior for success, validation errors, and session-expired paths.
    - Bot flow tests use fake timers to assert 600/400 timing contract and state transitions.
    - Accessibility tests verify live-region announcements and disabled input during bot turns.
  - **Risk**: medium - Timer-based tests can be flaky without strict control.

- [ ] **T15** - CI Pipeline Update (`.github/workflows/ci.yml`)
  - **Owner**: Ops CI Engineer
  - **Dependencies**: T01, T09, T10, T14
  - **Acceptance criteria**:
    - CI installs Java 21 and runs `mvn -f backend/pom.xml verify` in addition to existing JS checks.
    - Workflow fails fast on backend test/lint/build failures and reports clear logs.
    - Branch protection-required checks include backend verification job.
  - **Risk**: low - Known CI pattern, low functional uncertainty.

### Documentation
- [ ] **T16** - Documentation Update (`README.md` and backend usage)
  - **Owner**: Technical Author
  - **Dependencies**: T07, T08, T11, T15
  - **Acceptance criteria**:
    - README documents backend startup, frontend-backend integration flow, API endpoint summary, and test commands.
    - Include environment/CORS configuration and troubleshooting notes for local development.
    - Add architecture alignment note that backend is authoritative game rules source.
  - **Risk**: low - Documentation effort with limited implementation risk.

## 4. Risks and mitigations
- **Rule parity drift between JS and Java engine** (high)
  - Mitigation: shared rule test vectors and explicit winner/scoring fixtures in T09.
- **Async UI race conditions during bot reveal** (high)
  - Mitigation: single state transition reducer + cancellable timers + fake-timer tests in T14.
- **Contract mismatch between frontend/client DTOs and backend responses** (medium)
  - Mitigation: controller integration tests (T10) plus API client contract tests (T14).
- **Session expiry edge cases causing false 410s** (medium)
  - Mitigation: injectable clock strategy and expiry unit tests around boundary times.
- **Accessibility gaps not caught in manual testing** (medium)
  - Mitigation: explicit automated announcement/focus assertions in T14 and checklist-based UX QA.

## 5. Recommended test cases
- Engine parity: trump evaluation and trick-winner fixtures for SAUSPIEL, WENZ, SOLO.
- Legality enforcement: Folgepflicht positive/negative cases for human and bots.
- Bot behavior: lead/follow selection with partner winning, opponent winning, trump/no-trump paths.
- Session lifecycle: create, retrieve, update after play, expired session, new-round reset.
- API contract: status code matrix (`200`, `400`, `404`, `409`, `410`, `422`) with stable error schema.
- Frontend timing: ensure reveal sequence occurs exactly at 600 ms + 400 ms increments.
- Frontend state machine: verify lock/unlock of hand input across all states.
- Accessibility: live-region announcements and keyboard focus transitions for human-turn and error paths.
- CI smoke: full workspace run of JS tests and `mvn -f backend/pom.xml verify`.
