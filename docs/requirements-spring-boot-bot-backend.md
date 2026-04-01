# Requirements Specification: Spring Boot Backend with Bot-Player Logic

**Version**: 1.0  
**Date**: 2026-03-31  
**Status**: Draft — Pending architectural review  
**Author**: Requirements Engineer

---

## 1. Executive Summary

The human player currently must manually control every seat (all 4 players) in a Schafkopf game. This feature introduces a Spring Boot backend that manages full game sessions and provides autonomous bot-players for the 3 non-human seats. Once a game is started, the human only interacts at their own seat; the backend computes and applies all bot moves automatically, returning the updated game state to the frontend after each round of bot play.

**Business value**: A playable single-player experience against AI opponents, which is the most common way Schafkopf is played digitally.

---

## 2. Research Findings

### 2.1 Schafkopf AI in the Wild

Schafkopf is a 4-player imperfect-information trick-taking game with a strong tradition in Bavaria. Digital implementations (e.g., the official Bavarian State Ministry app "Bayern Schafkopf", open-source projects such as `cyroxx/schafkopf-engine`) universally use **rule-based heuristics** for beginner/medium bots and optionally **PIMC (Perfect Information Monte Carlo)** or **IS-MCTS (Information-Set Monte Carlo Tree Search)** for stronger bots.

### 2.2 AI Strategy Taxonomy for Trick-Taking Games

| Approach | Typical Usage | Pros | Cons |
|---|---|---|---|
| **Rule-based heuristics** | Beginner/medium bots | Fast, deterministic, testable, no training data needed | Can be exploited by experienced players |
| **PIMC (sample-then-minimax)** | Medium/hard bots | Handles hidden information by sampling possible opponent hands | Requires sampling & tree search (CPU overhead ~50–500 ms per move) |
| **IS-MCTS** | Strong bots | Near-optimal in imperfect-information games | Complex to implement; needs tuning; compute-heavy |
| **Deep Reinforcement Learning** | Research-grade | Potentially superhuman | Needs training infrastructure, large datasets, GPU; not appropriate without prior data |

### 2.3 Rule-Based Heuristics for Schafkopf (Established Patterns)

The following heuristics are well-documented in Schafkopf strategy literature and cover the vast majority of sensible plays:

**Declaring (Bidding) phase:**
- Evaluate hand strength: count trumps, Obers, Unters, high-point cards.
- Call Sauspiel if holding the called Ace (not trump) plus ≥2 matching suit cards.
- Call Wenz if holding ≥3 Unters.
- Call Solo if holding ≥5 trumps of a single suit (Ober + Unter + suit cards).
- Otherwise, pass.

**Card-play phase (following Folgepflicht — mandatory suit-following):**
1. **Lead priority**: Lead with highest trump to draw out opponents' trumps if you are the declarer; lead low plain-suit card if you are partner/defender.
2. **On-lead with trump-exhausted field**: Lead a high-point plain-suit Ace if opponents have no more trumps.
3. **Covering a trick in progress**: If partner is winning, play a low card (Schmieren — smearing points to partner); if opponent is winning, trump or cover if possible.
4. **Folgepflicht enforcement**: The bot must always follow the led suit (including trump as a unified suit) if it holds a matching card.
5. **Sauspiel partner recognition**: Identify the partner by the called Ace; play to set up partner's winning trick.

### 2.4 Verdict

For a functional first version, **rule-based heuristics** are the correct choice:

- They are deterministic and unit-testable without randomness seams.
- Response latency is < 1 ms per card selection, well under any UX threshold.
- The existing `gameRules.js` logic (trump determination, trick-winner) maps directly to a Java port.
- A clean `BotStrategy` interface can be introduced from the start to allow plugging in PIMC or MCTS in a future iteration without modifying the API contract.

### 2.5 Session Management Patterns

Because a Schafkopf game is short (8 tricks, ~32 card plays), full game state is compact (< 2 KB JSON). Two patterns apply:

- **Stateful server**: Server holds game state in memory keyed by session ID. Simple, fast lookups, requires session expiry.
- **Stateless (state on client)**: Client sends full game state payload each request. Avoids server memory management but increases payload size and trusts client-sent state.

For this feature, **stateful server** is recommended: game state integrity must be guarded server-side (the server is the authority on whose cards are legitimate), and a single-player game session is trivially bounded.

---

## 3. Assumptions

The following assumptions are made in lieu of clarifying questions. If any assumption is incorrect, it should be revised before implementation begins.

| ID | Assumption |
|---|---|
| A-01 | The **human player always occupies seat 0** (displayed as Player 1). Seats 1, 2, 3 are always bots. |
| A-02 | **Bidding is human-driven at game start**: the human selects game type (`SAUSPIEL`, `WENZ`, `SOLO`) and any options (called Ace for Sauspiel, solo suit for Solo) when starting the session. Bot bidding (bots proposing a game themselves) is out of scope for v1. |
| A-03 | **Bot difficulty is a single tier** (rule-based heuristics, medium strength). No difficulty selector is required in v1. |
| A-04 | **In-memory session store is sufficient** for v1. No database or Redis persistence is required. |
| A-05 | **No user authentication** is required. Sessions are identified by a server-generated UUID; no login flow is needed. |
| A-06 | **CORS policy** allows the frontend origin (e.g., `localhost`) to call the backend; exact allowed origins are configurable via `application.properties`. |
| A-07 | The **Java game-rules implementation** is a faithful port of the logic in `src/gameRules.js` and is the single source of truth for legality checks server-side. |
| A-08 | A **single active game per session** is supported. Restarting a session creates a new game. |
| A-09 | **Session expiry after 30 minutes of inactivity** is acceptable. Expired sessions return `410 Gone`. |
| A-10 | The frontend will be updated (separately) to call the backend API; this document only specifies the backend contract. |

---

## 4. Scope

### 4.1 In Scope

- Spring Boot 3.x (Java 21) backend in `backend/`
- Game session lifecycle: create, retrieve current state, play human card, reset
- Bot card-play logic for the 3 bot seats, triggered automatically after each human play
- Full game-rules enforcement server-side (Folgepflicht, trick winner, scoring)
- Deck shuffling and dealing at session creation
- End-of-game detection and final score computation
- REST JSON API consumed by the existing frontend
- Maven build (`backend/pom.xml`) compatible with the existing CI `backend-quality` job
- Unit tests for all bot-logic classes and game-rule utilities (JUnit 5 + Mockito)

### 4.2 Out of Scope (v1)

- Bot bidding decisions (who proposes a game type)
- Multiple bot difficulty tiers
- Spectator mode or multiplayer (human vs. human)
- WebSocket real-time streaming (REST polling is sufficient)
- Database persistence (in-memory only)
- User accounts, lobbies, leaderboards
- Frontend UI changes (managed separately)
- Schafkopf variants not in `GAME_TYPES`: Ramsch, Geier, Bettel
- Defensive Sauspiel (Gegensauspiel / Kontra / Re announcement)

---

## 5. Functional Requirements

### 5.1 Session Management

**FR-SES-01 — Create Game Session**  
The backend shall expose an endpoint (`POST /api/game/sessions`) that creates a new game session. The request payload shall include the game type and any game-type-specific options. The server shall:
1. Validate the game type and options.
2. Generate a cryptographically random UUID as the session ID.
3. Create and shuffle a 32-card long deck.
4. Deal 8 cards to each of 4 players.
5. Store the session state in memory.
6. Respond with the session ID, the human player's hand (seat 0), the game type, current player index (may be 0 or a bot if dealer rotation dictates), and trump suit.

**FR-SES-02 — Retrieve Session State**  
The backend shall expose `GET /api/game/sessions/{sessionId}` returning the current game state visible to the human player:
- Human's hand (current cards remaining in seat 0)
- Completed tricks (all 4 cards per trick + winner)
- Current trick (cards played so far in the active trick)
- Current player (whose turn it is)
- Bot hands are **not** included in the response (information hiding)
- Scores per side (declarers vs. defenders)
- Game status: `IN_PROGRESS`, `FINISHED`

**FR-SES-03 — Reset / New Game**  
The backend shall expose `DELETE /api/game/sessions/{sessionId}` to discard a session. A new session is created by calling `POST /api/game/sessions` again. This allows the frontend to start a fresh game without server restart.

**FR-SES-04 — Session Expiry**  
Sessions not accessed for 30 minutes shall be automatically evicted from the in-memory store. Requests to expired sessions shall return `410 Gone` with an explanatory message.

### 5.2 Human Card Play

**FR-PLAY-01 — Submit Human Card**  
The backend shall expose `POST /api/game/sessions/{sessionId}/play` accepting:
```json
{
  "card": { "suit": "E", "rank": "A" }
}
```
The server shall:
1. Verify the session is `IN_PROGRESS`.
2. Verify it is currently seat 0's turn.
3. Validate the card is in seat 0's hand.
4. Validate the card is a legal play under Folgepflicht.
5. Apply the card to the current trick.
6. Execute all subsequent bot turns (seats 1, 2, 3) until the trick is complete or it is seat 0's turn again.
7. If the trick is complete, apply trick scoring and advance to the next trick.
8. If all 8 tricks are complete, compute final scores and update game status to `FINISHED`.
9. Return the full updated client-visible game state.

**FR-PLAY-02 — Illegal Move Rejection**  
If the submitted card violates Folgepflicht (the player holds a card matching the led suit/trump and plays a different one), the server shall return `422 Unprocessable Entity` with a descriptive error body. The game state shall be unchanged.

**FR-PLAY-03 — Out-of-Turn Rejection**  
If a play request arrives when it is not seat 0's turn, the server shall return `409 Conflict`.

### 5.3 Bot Card Play

**FR-BOT-01 — Automatic Bot Execution**  
After every legal human play, the backend shall automatically compute and apply the moves of all consecutive bot seats (seats 1, 2, 3 as applicable) until either:
- It is seat 0's turn again, or
- The game ends.
Bot moves shall not require any additional request from the frontend.

**FR-BOT-02 — Legal Move Guarantee**  
Bot card selection shall always produce a legal card from the bot's hand. The selected card must satisfy Folgepflicht. Under no circumstances shall the bot attempt to play a card it does not hold or that violates game rules.

**FR-BOT-03 — Lead Strategy**  
When a bot leads a trick (is first to play), the selection heuristic shall be:
- If the bot is the declarer or declarer's partner and has trumps remaining: lead the highest trump.
- If the bot is a defender and holds no information advantage: lead a low-value plain-suit card or a suit where it may void opponents.
- If all opponents' trumps are exhausted and the bot holds a high Ace: lead the Ace.

**FR-BOT-04 — Follow Strategy**  
When a bot follows in a trick:
- If the bot must follow suit (Folgepflicht): play the lowest-ranking legal card of the required suit, unless the partner is winning the trick (in which case, play the highest-point card held in that suit to "smear" points to the partner).
- If the bot cannot follow suit: play the lowest-point card in hand (avoid giving points to the opponent who wins the trick), unless the bot can trump and doing so wins the trick — then use the lowest trump that wins.

**FR-BOT-05 — Partner Recognition (Sauspiel)**  
In a Sauspiel game, the bot seats shall identify the human's partner by detecting the called Ace. Bots on the same team as the human shall use cooperative play patterns (smearing points to the human, not trumping partner's winning trick unnecessarily).

**FR-BOT-06 — Pluggable Strategy Interface**  
The bot card selection shall be implemented behind a `BotStrategy` interface (or equivalent Spring `@Component` abstraction) so that alternative strategies (PIMC, MCTS) can be swapped in future without API changes.

```
interface BotStrategy {
    Card selectCard(GameState gameState, int botSeat);
}
```

### 5.4 Game Rules Enforcement

**FR-RULES-01 — Folgepflicht**  
The server shall enforce Schafkopf's mandatory suit-following rule: a player who holds one or more cards of the led suit (including trump as a unified suit) must play one of those cards.

**FR-RULES-02 — Trump Hierarchy**  
The server shall implement the correct trump ordering:
- Sauspiel: Eichel-O > Gras-O > Herz-O > Schellen-O > Eichel-U > Gras-U > Herz-U > Schellen-U > Heart A > Heart 10 > Heart K > Heart 9 > Heart 8 > Heart 7
- Wenz: Eichel-U > Gras-U > Herz-U > Schellen-U (no suit trumps)
- Solo: Obers > Unters > called suit A/10/K/9/8/7

**FR-RULES-03 — Trick Winner**  
Trick winner determination shall use the same algorithm as `determineTrickWinner` in `gameRules.js`, ported faithfully to Java.

**FR-RULES-04 — Scoring**  
Point values in cards shall match `CARD_POINTS` (A=11, 10=10, K=4, O=3, U=2, 9/8/7=0). Total card points sum to 120. The winning side needs > 60 to win a Sauspiel/Solo. Wenz uses the same threshold.

**FR-RULES-05 — Game End**  
The game shall be considered complete after 8 tricks are played (32 cards total). Final scores and the winning side shall be included in the game-state response.

---

## 6. Non-Functional Requirements

**NFR-PERF-01 — Bot Response Latency**  
The total server response time for `POST /api/game/sessions/{sessionId}/play` (including all bot turns) shall be ≤ 200 ms at the 95th percentile on consumer-grade hardware. Rule-based heuristics have negligible CPU cost; this is primarily a validation target.

**NFR-PERF-02 — Concurrent Sessions**  
The in-memory store shall support at least 100 concurrent game sessions without degradation. A `ConcurrentHashMap` with TTL eviction is sufficient.

**NFR-SEC-01 — Hand Confidentiality**  
Bot hands (cards held by seats 1–3) shall never appear in any API response sent to the client. Only the human's hand (seat 0) and cards already played to the table are visible.

**NFR-SEC-02 — Input Validation**  
All incoming JSON shall be validated using Bean Validation (`@Valid`, `@NotNull`, etc.). Malformed or unexpected fields shall return `400 Bad Request`. No stack trace shall appear in error responses.

**NFR-SEC-03 — Session ID Entropy**  
Session IDs shall be generated using `UUID.randomUUID()` (128-bit random UUID). Sequential or predictable IDs are not acceptable.

**NFR-SEC-04 — CORS Configuration**  
CORS shall be explicitly configured. The wildcard origin (`*`) is acceptable only in development profile. A configurable allowed-origins list shall be used for non-development profiles.

**NFR-TEST-01 — Unit Test Coverage**  
All `BotStrategy`, game-rule, and scoring classes shall have JUnit 5 unit tests. Coverage target: ≥ 80% line coverage on `src/main/java` excluding DTOs and configuration classes.

**NFR-TEST-02 — Deterministic Bot Tests**  
Bot unit tests shall use fixed, seeded hands to guarantee deterministic output. Tests shall assert the exact card selected given a known game state, not just that a legal card was played.

**NFR-TEST-03 — Integration Tests**  
At least one Spring Boot `@SpringBootTest` integration test shall exercise the full game loop: create session → play 8 tricks (human + bots) → verify correct winner.

**NFR-MAINT-01 — Java Version**  
Backend shall target Java 21 (LTS) and Spring Boot 3.x, matching the CI `setup-java` step.

**NFR-MAINT-02 — Build Compatibility**  
`mvn -f backend/pom.xml verify` shall complete successfully and shall be the sole command needed for CI validation, consistent with the existing `backend-quality` workflow job.

**NFR-MAINT-03 — Separation of Concerns**  
The backend shall not duplicate frontend rendering logic. Game rules (card legality, trump order) shall live in dedicated service classes, not inside REST controllers.

---

## 7. API Contract

### 7.1 Base URL

```
http://localhost:8080/api
```

All endpoints return `Content-Type: application/json`.

### 7.2 Create Session

```
POST /api/game/sessions
```

**Request body:**
```json
{
  "gameType": "SAUSPIEL",
  "calledAce": "E",
  "soloSuit": null
}
```

- `gameType`: `"SAUSPIEL"` | `"WENZ"` | `"SOLO"` (required)
- `calledAce`: Suit of the called Ace for Sauspiel (`"E"`, `"G"`, `"S"`); omitted for WENZ/SOLO
- `soloSuit`: Suit for Solo (`"E"`, `"G"`, `"H"`, `"S"`); omitted for SAUSPIEL/WENZ

**Response `201 Created`:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "humanHand": [
    { "suit": "E", "rank": "A" },
    { "suit": "H", "rank": "O" }
  ],
  "gameType": "SAUSPIEL",
  "calledAce": "E",
  "trumpSuit": "H",
  "currentPlayer": 0,
  "status": "IN_PROGRESS"
}
```

### 7.3 Get Session State

```
GET /api/game/sessions/{sessionId}
```

**Response `200 OK`:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "humanHand": [{ "suit": "E", "rank": "K" }],
  "currentTrick": [
    { "player": 0, "card": { "suit": "H", "rank": "A" } }
  ],
  "completedTricks": [
    {
      "plays": [
        { "player": 0, "card": { "suit": "E", "rank": "A" } },
        { "player": 1, "card": { "suit": "E", "rank": "K" } },
        { "player": 2, "card": { "suit": "E", "rank": "10" } },
        { "player": 3, "card": { "suit": "G", "rank": "7" } }
      ],
      "winner": 0,
      "points": 25
    }
  ],
  "scores": { "declarers": 25, "defenders": 0 },
  "currentPlayer": 0,
  "status": "IN_PROGRESS",
  "gameType": "SAUSPIEL",
  "calledAce": "E",
  "trumpSuit": "H"
}
```

### 7.4 Play a Card (Human)

```
POST /api/game/sessions/{sessionId}/play
```

**Request body:**
```json
{
  "card": { "suit": "H", "rank": "A" }
}
```

**Response `200 OK`:** Full session state (same shape as `GET /api/game/sessions/{sessionId}`) reflecting the applied human move and all subsequent bot moves.

**Error responses:**
| Status | Condition |
|---|---|
| `400 Bad Request` | Malformed JSON or missing fields |
| `404 Not Found` | Unknown session ID |
| `409 Conflict` | Not seat 0's turn |
| `410 Gone` | Session expired |
| `422 Unprocessable Entity` | Card not in hand, or Folgepflicht violation |

### 7.5 Delete Session

```
DELETE /api/game/sessions/{sessionId}
```

**Response `204 No Content`**

---

## 8. Data Models

### 8.1 Card
```
Card { suit: "E"|"G"|"H"|"S", rank: "7"|"8"|"9"|"U"|"O"|"K"|"10"|"A" }
```

### 8.2 GameStatus
```
GameStatus: "IN_PROGRESS" | "FINISHED"
```

### 8.3 GameSession (server-internal)
```
GameSession {
  sessionId: UUID,
  gameType: GameType,
  calledAce: Suit?,          // Sauspiel only
  soloSuit: Suit?,           // Solo only
  hands: List<Card>[4],      // index = seat number
  completedTricks: Trick[],
  currentTrick: Play[],      // 0–4 entries
  lastAccessedAt: Instant,   // for TTL eviction
  status: GameStatus
}
```

---

## 9. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | `POST /api/game/sessions` with valid SAUSPIEL input returns `201`, a UUID session ID, exactly 8 cards in `humanHand`, and `currentPlayer: 0`. |
| AC-02 | `POST /api/game/sessions` with `gameType: "SOLO"` and no `soloSuit` returns `400`. |
| AC-03 | After a legal human card play, the response's `currentPlayer` is 0 (the backend has already resolved all bot turns for that trick). |
| AC-04 | After a human play that violates Folgepflicht, the response is `422` and the game state is unchanged. |
| AC-05 | After submitting a card not in the human hand, the response is `422`. |
| AC-06 | After 8 tricks the response `status` is `"FINISHED"` and `scores.declarers + scores.defenders == 120`. |
| AC-07 | No bot hand cards appear anywhere in any API response body at any point in the game. |
| AC-08 | A session ID is not guessable; two consecutive sessions have statistically independent UUIDs. |
| AC-09 | `GET /api/game/sessions/{unknownId}` returns `404`. |
| AC-10 | `mvn -f backend/pom.xml verify` passes in CI (Java 21, no network calls during tests). |
| AC-11 | Bot plays are always legal: the integration test that runs a full game to completion never triggers a Folgepflicht violation from a bot. |
| AC-12 | Unit tests for `RuleBasedBotStrategy` assert exact card selection for ≥ 5 deterministic scenarios. |

---

## 10. Dependencies

| Dependency | Notes |
|---|---|
| Java 21 (Temurin) | Already configured in `.github/workflows/ci.yml` |
| Spring Boot 3.x (`spring-boot-starter-web`) | REST API framework |
| Spring Boot Validation (`spring-boot-starter-validation`) | Bean Validation for request DTOs |
| Jackson (`jackson-databind`) | JSON serialization; included transitively |
| JUnit 5 | Already implied by Spring Boot test starter |
| Mockito | Optional, for isolating `BotStrategy` in controller tests |
| Frontend axis change | Frontend must be updated to call the new REST API instead of driving all moves locally (tracked as a separate frontend task) |

---

## 11. Out-of-Scope Items (Explicit)

1. **Bot bidding**: Bots do not propose game types. Human selects game type at session creation.
2. **Kontra / Re announcements**: Score multipliers are not in scope.
3. **Ramsch variant**: Not currently in `GAME_TYPES`; excluded.
4. **Persistent storage**: No PostgreSQL, H2, or Redis integration in v1.
5. **Frontend changes**: A separate frontend task will wire the UI to the new API.
6. **Authentication / JWT**: No security layer on the API in v1 (localhost-only development use case assumed).
7. **Bot difficulty levels**: Only one rule-based difficulty level in v1.
8. **WebSocket / server-sent events**: Not required; REST response includes all bot moves already applied.
9. **Deployment / containerisation**: Docker and deployment manifests are not in scope for this feature.
