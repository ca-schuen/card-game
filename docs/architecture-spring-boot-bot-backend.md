# Architecture Decision Record: Spring Boot Bot-Player Backend

**ADR ID**: ADR-001  
**Status**: Accepted  
**Date**: 2026-03-31  
**Author**: Software Architect  
**Related Requirements**: `docs/requirements-spring-boot-bot-backend.md`

---

## 1. Executive Summary

The Schafkopf card game requires a Spring Boot 3.x (Java 21) backend that owns authoritative game state, enforces rules, and drives three rule-based bot players automatically after each human move. This ADR documents every significant design decision, the alternatives considered, and the rationale for the chosen approach. The backend lives entirely in `backend/` and exposes a stateful REST JSON API; the existing JavaScript frontend calls it without modification to its game-rules code.

---

## 2. Problem Statement and Constraints

| Constraint | Detail |
|---|---|
| Technology | Spring Boot 3.x, Java 21 (LTS), Maven |
| No external storage | In-memory only for v1; no Redis, no database |
| Information hiding | Bot hands must never reach the client |
| Rules fidelity | Java rules must match `src/gameRules.js` exactly |
| Latency | ≤ 200 ms at p95 for a full play-plus-bot-resolution round |
| Build | `mvn -f backend/pom.xml verify` must be the single CI command |
| Security | OWASP input-validation, no stack traces in responses, configurable CORS |

---

## 3. Design Decisions

### 3.1 Project Layout

#### Alternatives Considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — Standard Maven layout, single module** | `backend/` contains `pom.xml`, `src/main/java/`, `src/test/java/` | Simple; CI already expects this; no multi-module overhead | All packages in one artifact (acceptable at this scale) |
| B — Multi-module Maven | Separate `engine`, `api`, `bot` modules under `backend/` | Enforces compile-time layer isolation | Overkill for a single-service application; longer build setup |
| C — Gradle | Replace Maven with Gradle | Faster incremental builds | CI workflow expects Maven; changing it adds risk with no benefit |

**Decision: Option A.** A flat, single-module Maven project under `backend/` is correct for this scope and matches CI expectations exactly.

#### Chosen Package Tree

```
backend/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/schafkopf/
    │   │       ├── BackendApplication.java
    │   │       ├── config/
    │   │       │   ├── CorsConfig.java          # WebMvcConfigurer CORS
    │   │       │   └── SchedulerConfig.java     # @EnableScheduling
    │   │       ├── controller/
    │   │       │   └── GameSessionController.java
    │   │       ├── dto/
    │   │       │   ├── CreateSessionRequest.java
    │   │       │   ├── PlayCardRequest.java
    │   │       │   ├── CardDto.java
    │   │       │   ├── TrickPlayDto.java
    │   │       │   └── GameStateResponse.java
    │   │       ├── domain/
    │   │       │   ├── Card.java                # value object: suit + rank
    │   │       │   ├── GameType.java            # SAUSPIEL | WENZ | SOLO
    │   │       │   ├── GamePhase.java           # IN_PROGRESS | FINISHED
    │   │       │   ├── TrickPlay.java           # { seat, card }
    │   │       │   └── GameSession.java         # full authoritative state
    │   │       ├── engine/
    │   │       │   ├── DeckFactory.java         # create + shuffle 32 cards
    │   │       │   ├── TrumpEvaluator.java      # isTrump, scoreTrump, scorePlain
    │   │       │   ├── TrickResolver.java       # determineTrickWinner, points
    │   │       │   └── GameEngine.java          # orchestrates a full turn cycle
    │   │       ├── bot/
    │   │       │   ├── BotStrategy.java         # interface
    │   │       │   └── HeuristicBotStrategy.java
    │   │       └── service/
    │   │           ├── SessionStore.java        # interface
    │   │           ├── InMemorySessionStore.java# ConcurrentHashMap + TTL eviction
    │   │           └── GameService.java         # use-case orchestration
    │   └── resources/
    │       └── application.properties
    └── test/
        └── java/
            └── com/schafkopf/
                ├── engine/
                │   ├── TrumpEvaluatorTest.java
                │   └── TrickResolverTest.java
                ├── bot/
                │   └── HeuristicBotStrategyTest.java
                ├── service/
                │   └── GameServiceTest.java
                └── controller/
                    └── GameSessionControllerTest.java  # MockMvc
```

**Rationale**: The package tree enforces a strict unidirectional dependency: `controller → service → engine/bot → domain`. DTO classes are separate from domain classes so the internal model never leaks to wire format.

---

### 3.2 Session Management

#### Alternatives Considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — `ConcurrentHashMap` + `@Scheduled` eviction** | `InMemorySessionStore` wraps a `ConcurrentHashMap<UUID, GameSession>` where each session carries a `lastAccessedAt` timestamp; a `@Scheduled` task scans and evicts entries older than 30 min | Zero external dependencies; trivially unit-testable; matches NFR for 100 concurrent sessions | State lost on restart (acceptable for v1); no cluster distribution |
| B — Spring Session (in-memory) | Replace custom store with `spring-session-core` backed by `MapSessionRepository` | Standard abstraction | Designed for HTTP session tracking; not a natural fit for domain game state; adds a dependency for no additional benefit |
| C — Redis with Spring Cache | Externalize sessions to Redis | Survives restart; horizontally scalable | Requires Redis infrastructure; massively over-engineered for v1; contradicts NFR-MAINT |

**Decision: Option A.** A hand-rolled `ConcurrentHashMap` store with scheduled eviction is the right and simplest tool. It fulfils all v1 NFRs and is trivially testable.

#### `InMemorySessionStore` Design

```java
@Component
public class InMemorySessionStore implements SessionStore {

    private static final Duration TTL = Duration.ofMinutes(30);

    // key: sessionId string, value: timestamped wrapper
    private final ConcurrentHashMap<String, TimestampedSession> store =
        new ConcurrentHashMap<>();

    @Override
    public void save(GameSession session) { ... }

    @Override
    public Optional<GameSession> findById(String id) {
        TimestampedSession ts = store.get(id);
        if (ts == null) return Optional.empty();
        ts.touch();
        return Optional.of(ts.session());
    }

    @Override
    public void delete(String id) { store.remove(id); }

    /** Runs every 5 minutes; evicts sessions idle for > 30 minutes. */
    @Scheduled(fixedDelay = 300_000)
    public void evictExpired() {
        Instant cutoff = Instant.now().minus(TTL);
        store.entrySet().removeIf(e -> e.getValue().lastAccessed().isBefore(cutoff));
    }
}
```

`TimestampedSession` is a simple record:

```java
record TimestampedSession(GameSession session, AtomicReference<Instant> lastAccessed) {
    void touch() { lastAccessed.set(Instant.now()); }
}
```

---

### 3.3 Game Engine — Java Port vs. Node Subprocess

#### Alternatives Considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — Pure Java engine** | Port `gameRules.js` logic to Java classes (`TrumpEvaluator`, `TrickResolver`) | Single process; testable; no IPC overhead; full type safety | Requires maintaining two implementations (JS + Java); divergence risk mitigated by shared test vectors |
| B — Node.js subprocess | Spring calls `node gameRules.js` via `ProcessBuilder` on each request | Only one rules implementation | Process spawn latency (10–100 ms); JSON serialization round-trip; operational complexity; fragile classpath coupling; violates NFR-PERF-01 |
| C — GraalVM Polyglot | Embed a GraalVM JS engine and call `gameRules.js` directly | Share one source | GraalVM-specific JVM; major DevOps complexity; not compatible with plain OpenJDK 21 CI setup |

**Decision: Option A.** The rules logic in `gameRules.js` is modest in size and complexity. A faithful Java port is maintainable, delivers microsecond latency, and can be verified by running the same test vectors against both implementations. The shared game-logic test vectors are documented in [Section 6](#6-testing-strategy).

#### Key engine classes

**`TrumpEvaluator`** (pure static methods, no Spring dependency):

```java
public final class TrumpEvaluator {
    // isTrump, scoreTrump, scorePlain — direct port of gameRules.js
    public static boolean isTrump(Card card, GameType type, String soloSuit) { ... }
    public static int scoreTrump(Card card, GameType type, String soloSuit) { ... }
    public static int scorePlain(Card card) { ... }
}
```

**`TrickResolver`**:

```java
public final class TrickResolver {
    public static int determineTrickWinner(List<TrickPlay> trick, GameType type, String soloSuit) { ... }
    public static int countTrickPoints(List<TrickPlay> trick) { ... }
}
```

**`DeckFactory`**:

```java
@Component
public class DeckFactory {
    private final Random rng;  // injected; can be seeded in tests
    public List<Card> createShuffledDeck() { ... }
    public List<List<Card>> deal(List<Card> deck, int players, int cardsPerPlayer) { ... }
}
```

Using constructor-injected `Random` (or `SecureRandom` for production) enables deterministic tests via a seeded instance.

---

### 3.4 Bot AI Architecture

#### Alternatives Considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — `BotStrategy` interface + `HeuristicBotStrategy`** | Thin interface `Card selectCard(BotContext ctx)`; one rule-based implementation wired by default | Immediately swappable; fully testable; < 1 ms per card selection | Heuristics require careful encoding of Schafkopf strategy rules |
| B — PIMC sampling from day one | Randomly sample 50 possible hand distributions, run minimax per sample | Stronger play | ~50–500 ms per move (violates NFR-PERF-01); out of scope for v1 |
| C — Flat procedural method in controller | Inline bot logic in the REST handler | Quick to write | Not testable in isolation; permanently blocks future improvements |

**Decision: Option A.** The interface/implementation split is the correct pattern here. `HeuristicBotStrategy` is injected by default; PIMC can be registered as an alternative Spring bean in a future sprint.

#### Interface

```java
/** Context passed to a bot strategy for a single card-selection decision. */
public record BotContext(
    GameSession session,
    int botSeat
) {}

public interface BotStrategy {
    /**
     * Selects a card for {@code botSeat} to play in the current trick.
     * The returned card MUST be in {@code session.handOf(botSeat)}
     * and MUST satisfy Folgepflicht.
     */
    Card selectCard(BotContext ctx);
}
```

#### `HeuristicBotStrategy` Logic Summary

The heuristic implements the rules documented in §2.3 of the requirements specification. The decision tree is:

```
selectCard(ctx):
  legalCards ← GameEngine.legalCards(session, botSeat)     // Folgepflicht filter
  if legalCards.size() == 1:
      return legalCards.get(0)                              // no choice

  if bot is LEADING the trick:
      return leadHeuristic(legalCards, ctx)
  else:
      return followHeuristic(legalCards, ctx)

leadHeuristic:
  if bot is on declaring side AND has trumps:
      return highest trump                                  // draw trumps
  if opponents' trumps exhausted AND holds plain Ace:
      return plain Ace                                      // cash safe Ace
  return lowest-point plain card                            // safe small lead

followHeuristic:
  partnerIsWinning ← currentTrickWinner(session) is on same team as bot
  if partnerIsWinning:
      return highest-point card in hand matching required suit  // smear
  if canTrumpAndWin(legalCards):
      return lowestTrumpThatWins                            // win economically
  return lowestPointCard(legalCards)                        // minimise gift
```

---

### 3.5 `GameSession` Domain Model

`GameSession` is a mutable aggregate root. It is only accessed through `GameService` (never directly by the controller), which holds the `SessionStore` lock-scope boundary.

```java
public class GameSession {
    private final String sessionId;         // UUID string
    private final GameType gameType;
    private final String soloSuit;          // null unless SOLO
    private final String calledAce;         // "EA" / "GA" etc. for SAUSPIEL; null otherwise
    private final List<List<Card>> hands;   // index = seat 0–3; seat 0 = human
    private final List<TrickResult> completedTricks;
    private List<TrickPlay> currentTrick;  // plays in current trick, in play order
    private GamePhase phase;               // IN_PROGRESS | FINISHED
    private int currentSeat;              // whose turn it is
    private int declarerSeat;             // seat that called the game
    // scores are derived from completedTricks, never stored separately
}
```

**Invariants enforced by `GameSession`**:
- `hands.get(seat)` never returns null; empty list means seat exhausted all cards.
- `completedTricks` is append-only; no removal after settlement.
- `currentTrick` is emptied after trick settlement.

---

### 3.6 `GameEngine` Orchestration

`GameEngine` is a Spring `@Service` that orchestrates one full turn cycle:

```java
@Service
public class GameEngine {

    private final BotStrategy botStrategy;

    /** Apply the human's card and then run all consecutive bot seats. */
    public void applyHumanPlay(GameSession session, Card card) {
        validateAndApply(session, HUMAN_SEAT, card);
        driveBotsUntilHumanOrEnd(session);
    }

    private void driveBotsUntilHumanOrEnd(GameSession session) {
        while (session.getPhase() == GamePhase.IN_PROGRESS
               && session.getCurrentSeat() != HUMAN_SEAT) {
            int seat = session.getCurrentSeat();
            Card chosen = botStrategy.selectCard(new BotContext(session, seat));
            validateAndApply(session, seat, chosen);
        }
    }

    private void validateAndApply(GameSession session, int seat, Card card) {
        List<Card> legal = legalCards(session, seat);
        if (!legal.contains(card)) {
            throw new IllegalMoveException(seat, card, legal);
        }
        session.playCard(seat, card);
        if (session.getCurrentTrick().size() == 4) {
            settleTrick(session);
        }
    }

    public List<Card> legalCards(GameSession session, int seat) {
        // Implements Folgepflicht: if any card in hand matches led suit/trump,
        // only those cards are legal. Otherwise, all cards are legal.
        ...
    }
}
```

The engine is the **only** class allowed to mutate `GameSession`. The controller never calls `session.playCard()` directly.

---

### 3.7 REST Controller

```java
@RestController
@RequestMapping("/api/game/sessions")
@Validated
public class GameSessionController {

    private final GameService gameService;

    @PostMapping
    public ResponseEntity<GameStateResponse> create(
            @RequestBody @Valid CreateSessionRequest req) { ... }

    @GetMapping("/{sessionId}")
    public ResponseEntity<GameStateResponse> getState(
            @PathVariable String sessionId) { ... }

    @PostMapping("/{sessionId}/play")
    public ResponseEntity<GameStateResponse> play(
            @PathVariable String sessionId,
            @RequestBody @Valid PlayCardRequest req) { ... }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> delete(
            @PathVariable String sessionId) { ... }
}
```

Error responses are handled by a `@RestControllerAdvice` that maps domain exceptions to HTTP status codes without leaking stack traces:

| Exception | HTTP Status |
|---|---|
| `SessionNotFoundException` (expired/invalid ID) | `410 Gone` |
| `IllegalMoveException` (Folgepflicht violation) | `422 Unprocessable Entity` |
| `OutOfTurnException` | `409 Conflict` |
| `MethodArgumentNotValidException` (Bean Validation) | `400 Bad Request` |
| Any uncaught `RuntimeException` | `500 Internal Server Error` (generic message only) |

---

### 3.8 CORS Configuration

#### Alternatives Considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — `WebMvcConfigurer` with `@Value`-injected origins** | One `CorsConfig` bean; allowed origins read from `application.properties` | Fully configurable per profile; no wildcard in production | Requires env-correct properties file |
| B — `@CrossOrigin` on each controller | Annotate each `@RestController` | Simple for small projects | Origins hardcoded in Java; not configurable without recompile |
| C — `spring.web.cors.*` auto-configuration | Put config in YAML | Declarative | Requires Spring Boot 3.2+ and custom `WebMvcAutoConfiguration` override; fragile |

**Decision: Option A.**

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET", "POST", "DELETE")
            .allowedHeaders("Content-Type")
            .maxAge(3600);
    }
}
```

`application.properties` (local dev):
```properties
cors.allowed-origins=http://localhost:5500,http://localhost:3000,http://127.0.0.1:5500
```

`application-prod.properties`:
```properties
cors.allowed-origins=https://your-production-domain.example.com
```

An active Spring profile (`spring.profiles.active=prod`) switches from dev to prod CORS policy.

---

## 4. Data Flow Diagram

### 4.1 POST `/api/game/sessions/{id}/play`

```
Frontend                  GameSessionController       GameService
─────────                 ─────────────────────       ───────────
POST /play                      │                         │
  card: {suit,rank}  ──────────>│                         │
                                │──── gameService ────────>│
                                │     .playHumanCard()     │
                                │                    ┌─────┴──────────────────────────────┐
                                │                    │ 1. sessionStore.findById(id)        │
                                │                    │    → 410 Gone if expired            │
                                │                    │ 2. verify phase == IN_PROGRESS      │
                                │                    │ 3. verify currentSeat == 0          │
                                │                    │    → 409 Conflict otherwise         │
                                │                    │ 4. gameEngine.applyHumanPlay()      │
                                │                    │   ┌─ validateAndApply(seat=0, card) │
                                │                    │   │  legalCards = Folgepflicht check│
                                │                    │   │  → 422 if illegal               │
                                │                    │   │  session.playCard(0, card)       │
                                │                    │   │  if trick complete → settleTrick │
                                │                    │   └─ driveBotsUntilHumanOrEnd()     │
                                │                    │     for each bot seat (1,2,3):      │
                                │                    │       botStrategy.selectCard()      │
                                │                    │       validateAndApply(seat, card)  │
                                │                    │       if trick complete → settle    │
                                │                    │     (loop until seat==0 or FINISHED)│
                                │                    │ 5. sessionStore.save(session)       │
                                │                    │ 6. return GameStateResponse         │
                                │                    └────────────────────────────────────┘
                                │<─── GameStateResponse ──│
HTTP 200 + JSON  <──────────────│
```

### 4.2 `GameStateResponse` (never includes bot hands)

```json
{
  "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "humanHand": [
    { "suit": "H", "rank": "O" },
    { "suit": "E", "rank": "A" }
  ],
  "currentTrick": [
    { "seat": 0, "card": { "suit": "G", "rank": "U" } }
  ],
  "completedTricks": [
    {
      "plays": [
        { "seat": 3, "card": { "suit": "H", "rank": "7" } },
        { "seat": 0, "card": { "suit": "H", "rank": "A" } },
        { "seat": 1, "card": { "suit": "H", "rank": "8" } },
        { "seat": 2, "card": { "suit": "H", "rank": "9" } }
      ],
      "winnerSeat": 0,
      "points": 11
    }
  ],
  "teamPoints": 32,
  "opponentPoints": 0,
  "trickCount": 1,
  "phase": "IN_PROGRESS",
  "currentSeat": 0,
  "gameType": "sauspiel",
  "soloSuit": null,
  "humanSeat": 0
}
```

---

## 5. Technology Stack and Key Dependencies

### 5.1 Maven `pom.xml` Key Excerpt

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
</parent>

<properties>
    <java.version>21</java.version>
</properties>

<dependencies>
    <!-- Web + Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
        <!-- includes JUnit 5, Mockito, MockMvc, AssertJ -->
    </dependency>
</dependencies>
```

No Lombok, no MapStruct, no database driver. Dependencies are kept to the Spring Boot starter minimum to reduce the attack surface and build time.

### 5.2 Java 21 Features Used

| Feature | Usage |
|---|---|
| Records | `BotContext`, `TrickPlay`, `CardDto`, `TimestampedSession` |
| Sealed interfaces | `GamePhase` as sealed interface (or `enum`) |
| Pattern matching `instanceof` | Null-safe card comparisons in heuristics |
| Text blocks | Multi-line error messages in tests |
| Virtual threads (optional) | `spring.threads.virtual.enabled=true` — negligible benefit at this concurrency level but costs nothing to enable |

---

## 6. Testing Strategy

### 6.1 Layer Coverage

| Layer | Tool | What is tested |
|---|---|---|
| `TrumpEvaluator` | JUnit 5, plain | All trump orderings for SAUSPIEL / WENZ / SOLO across all 32 cards |
| `TrickResolver` | JUnit 5, plain | All trick-winning edge cases (all-trump, mixed, suit-only) |
| `HeuristicBotStrategy` | JUnit 5, plain | Fixed known hands → assert exact card selected |
| `GameEngine` | JUnit 5 + Mockito | Folgepflicht enforcement; bot loop stops at correct seat |
| `InMemorySessionStore` | JUnit 5, plain | Save / find / delete / TTL eviction |
| `GameSessionController` | MockMvc + Mockito | HTTP 200/400/409/410/422 for each endpoint |
| Full game loop | `@SpringBootTest` | Create session → play all 32 cards → verify scores sum to 120 |

### 6.2 Deterministic Bot Tests

Bot tests must never be flaky. Hands are constructed in code, not randomly:

```java
@Test
void botLeadsHighestTrumpWhenDeclarer() {
    // SAUSPIEL: trump suit = Herz
    List<Card> botHand = List.of(
        new Card("H", "O"),   // highest trump by score
        new Card("E", "U"),
        new Card("G", "7"),
        new Card("S", "8")
    );
    GameSession session = GameSessionFixtures.withBotHandLeading(1, botHand, GameType.SAUSPIEL);
    BotContext ctx = new BotContext(session, 1);

    Card selected = strategy.selectCard(ctx);

    assertThat(selected).isEqualTo(new Card("H", "O"));
}
```

### 6.3 Shared Test Vectors with JavaScript

To guard against JS/Java rule divergence, a set of canonical trick scenarios is encoded in `backend/src/test/resources/test-vectors/tricks.json`. The same JSON is referenced by `tests/gameRules.test.js` to verify identical outcomes in both languages.

```json
[
  {
    "description": "All trumps: Eichel-O beats Herz-O in SAUSPIEL",
    "gameType": "sauspiel",
    "trick": [
      { "player": 0, "card": { "suit": "H", "rank": "O" } },
      { "player": 1, "card": { "suit": "E", "rank": "O" } },
      { "player": 2, "card": { "suit": "H", "rank": "7" } },
      { "player": 3, "card": { "suit": "G", "rank": "8" } }
    ],
    "expectedWinner": 1
  }
]
```

---

## 7. Security Configuration

### 7.1 Input Validation

Every request DTO is annotated with Bean Validation constraints:

```java
public record PlayCardRequest(
    @NotNull @Valid CardDto card
) {}

public record CardDto(
    @NotBlank @Pattern(regexp = "^[EGHS]$") String suit,
    @NotBlank @Pattern(regexp = "^(7|8|9|U|O|K|10|A)$") String rank
) {}
```

An unknown field arriving in JSON is silently ignored (`DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES = false` by default in Spring Boot). Any constraint violation returns `400 Bad Request` via `MethodArgumentNotValidException` handler — no stack trace.

### 7.2 Error Response Shape

All error responses use a uniform, non-leaking JSON body:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    record ErrorResponse(int status, String error, String message) {}

    @ExceptionHandler(SessionNotFoundException.class)
    ResponseEntity<ErrorResponse> handleExpired(SessionNotFoundException ex) {
        return ResponseEntity.status(410)
            .body(new ErrorResponse(410, "Gone", ex.getMessage()));
    }
    // ... similar for 409, 422, 400, 500
}
```

The `500` handler logs the exception at ERROR level but returns only:
```json
{ "status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred." }
```

### 7.3 CORS Security Note

The wildcard origin (`*`) is **not used** — not even in development. `allowedOrigins` is always an explicit list. `allowCredentials(true)` is omitted because sessions are identified by UUID in the request path, not via cookies, which avoids CSRF risk entirely.

### 7.4 Session ID Entropy

`UUID.randomUUID()` provides 122 bits of randomness. The session ID is not a bearer token for privileged operations, so this is sufficient. If a seat-0 check were removed in future to allow spectators, session IDs should be upgraded to a signed JWT — documented as a known limitation.

---

## 8. Scalability and Maintainability Considerations

| Concern | v1 Decision | Future Path |
|---|---|---|
| State distribution | Single JVM, in-memory | Replace `InMemorySessionStore` with `RedisSessionStore` implementing the same interface; no controller or engine changes required |
| Bot strength | Rule-based heuristics | Drop-in `PimcBotStrategy` or `MctsRootBotStrategy` implementing `BotStrategy`; selected via Spring profile or configuration property |
| Bidding phase | Human-only | Add a `BiddingService` with the same `BotStrategy` pattern; game creation POST can optionally receive `"autoSelectGameType": true` |
| WebSocket | REST polling | Replace controller layer with a STOMP endpoint; `GameEngine` and `SessionStore` are unaffected |
| Frontend deployment | Dev server on port 5500 | Configure `cors.allowed-origins` per environment without code change |

---

## 9. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Java rules diverge from JavaScript rules | Medium | High — game behaves differently in backend vs. standalone frontend | Shared test-vector JSON file; property-based test with random decks comparing outputs |
| Heuristic bot plays illegal card | Low | High — crashes the game loop | `validateAndApply` always re-checks legality for bot cards; throws `IllegalStateException` (bug, not client error) if violated |
| ConcurrentHashMap race condition | Low | Medium — two tabs / retry floods | `GameSession` mutations are protected by a per-session `ReentrantLock` inside `GameService.playHumanCard()` |
| Memory leak from orphaned sessions | Low | Low | `@Scheduled` eviction; tested by a dedicated integration test |
| CORS misconfiguration breaks frontend | Medium | Medium | Dev profile tested in CI with a mock frontend HTTP call |

### 9.1 Per-Session Locking

Because a browser might retry a failed request, two simultaneous `POST /play` requests for the same session must not both apply. `GameService` holds a `ConcurrentHashMap<String, ReentrantLock>` of per-session locks:

```java
public GameStateResponse playHumanCard(String sessionId, Card card) {
    ReentrantLock lock = sessionLocks.computeIfAbsent(sessionId, k -> new ReentrantLock());
    lock.lock();
    try {
        GameSession session = sessionStore.findById(sessionId)
            .orElseThrow(() -> new SessionNotFoundException(sessionId));
        gameEngine.applyHumanPlay(session, card);
        sessionStore.save(session);
        return GameStateResponse.from(session);
    } finally {
        lock.unlock();
    }
}
```

---

## 10. Known Limitations

1. **No bidding by bots**: Bots do not propose a game type. The human always declares. This is acceptable for v1 (A-02).
2. **No Kontra/Re announcements**: Defensive doubling is out of scope.
3. **In-memory only**: Sessions are lost on server restart. Not a problem for a development or demo environment; requires `RedisSessionStore` for production persistence.
4. **Single game type per session**: Changing game type mid-session is not supported; a new session must be created.
5. **No authentication**: Session UUIDs are not authenticated. Any client knowing the UUID can interact with that session. For a public deployment, an authentication layer would be required before any session ID is served.

---

## 11. Implementation Sequence

A suggested task order for the `Frontend Developer` / `Backend Developer` agents:

1. `Card`, `GameType`, `GamePhase`, `TrickPlay`, `GameSession` domain classes (no Spring, fully testable)
2. `TrumpEvaluator` + `TrickResolver` with full JUnit 5 coverage using shared test vectors
3. `DeckFactory` (shuffled deck, deterministic in tests via injected `Random`)
4. `HeuristicBotStrategy` with deterministic unit tests
5. `GameEngine` (Folgepflicht filter + bot drive loop)
6. `InMemorySessionStore` with TTL eviction
7. `GameService` (orchestration + per-session locking)
8. DTOs and `GameStateResponse.from(session)` mapper
9. `GameSessionController` with `MockMvc` tests
10. `CorsConfig` and `GlobalExceptionHandler`
11. `@SpringBootTest` full game-loop integration test
12. CI Maven verify confirmation

---

*End of ADR-001*
