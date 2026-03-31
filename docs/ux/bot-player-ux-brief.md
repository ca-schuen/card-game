# UX Design Brief: Bot-Player Integration

**Feature**: Bot-player automation (seats 1–3)  
**Author**: UI/UX Designer  
**Date**: 2026-03-31  
**Status**: Approved for implementation  
**Related docs**:
- `docs/requirements-spring-boot-bot-backend.md`
- `docs/architecture-spring-boot-bot-backend.md`
- `docs/ux/german-altenburg-card-graphics-ux-brief.md`

---

## 1. Overview

This brief covers every UI/UX decision required to transition Sauspiel from a "manual 4-player demo" experience to a **single-player-vs-bots** experience. The human always occupies seat 0. After the human plays a card, the Spring Boot backend resolves all bot moves automatically and returns the full updated state. The frontend must bridge the gap between an instant API response and a _legible, human-paced card reveal_.

---

## 2. Assumptions (Resolved Without Q&A)

Three questions were identified as critical ambiguities. They are resolved here as assumptions because implementation must proceed without blocking on answers. If any assumption is incorrect, revise the specification before frontend coding begins.

| ID | Question | Assumption | Rationale |
|---|---|---|---|
| Q-01 | Sequential or simultaneous bot card reveal? | **Sequential, 400 ms between each card** | Simultaneous reveals make tricks unreadable; 400 ms matches natural card-play pacing and gives the player time to notice each bot card individually |
| Q-02 | Should there be an explicit "thinking" indicator, or just the card appearing? | **Pulsing "..." label for a minimum of 600 ms before the first bot card appears**, even if the API responds immediately | Zero-delay reveals feel inhuman and confusing; 600 ms guarantees the player registers that a bot is acting, not a system glitch |
| Q-03 | Round-end presentation: modal overlay or inline panel? | **Inline score banner + "Play Next Round →" button** (no modal) | Modals interrupt flow and require dismissal before anything else is readable. An inline banner lets the player review scores and proceed naturally |

---

## 3. User Journey Map

### 3.1 Entry Points

| Entry Point | Trigger | Expected State |
|---|---|---|
| Fresh page load | User visits the app | `idle` — welcome message, disabled hand section, no trick shown |
| Clicking "New Game" | Any game state | Begin `game-creating` flow |

### 3.2 Happy Path: One Full Round

```
[Page load]
    │
    ▼
[IDLE] ─── user clicks "New Game" ───►  [GAME CREATING]
                                              │ POST /api/game/sessions
                                              │ (spinner on button, button disabled)
                                              ▼
                                        [BIDDING PHASE]
                                        Show game-type selector:
                                        Sauspiel / Wenz / Solo (+ options)
                                        Only human (seat 0) can bid in v1
                                              │ user selects game type
                                              ▼
                                        [HUMAN TURN — trick starts]
                                        Hand section enabled; playable cards
                                        glow green; turn banner shows "Your Turn"
                                              │ user clicks a valid card
                                              ▼
                                        [SUBMITTING]
                                        Clicked card slides into trick position 0;
                                        hand section disabled (pointer-events: none);
                                        "Bot 1 is thinking…" pulse label appears
                                        after 150 ms
                                              │ POST /api/game/sessions/{id}/play
                                              │ (API resolves all 3 bots server-side)
                                              ▼
                                        [BOTS RESOLVING] ← animated sequence:
                                        t = 0 ms:   API response received
                                        t = 600 ms: Bot 1's card flips into position 1
                                        t = 1000 ms: Bot 2's card flips into position 2
                                        t = 1400 ms: Bot 3's card flips into position 3
                                              │
                                              ▼
                                        [TRICK COMPLETE — 1800 ms pause]
                                        Winner's position highlighted with gold ring;
                                        "Bot X wins (N pts)" or "You win! (N pts)";
                                        aria-live announcement
                                              │ 1800 ms elapses
                                              ▼
                          ┌──────── Are there more tricks? ───────┐
                          │ Yes                                    │ No (8th trick done)
                          ▼                                        ▼
                    [NEXT TRICK START]                      [ROUND COMPLETE]
                    Clear trick area;                        Inline score banner
                    resolve bot leads                        with team points;
                    if bot won trick —                       "Play Next Round →" btn
                    show bot lead card(s) at
                    400 ms per card, then
                    enable human hand
                          │
                          └──────► back to [HUMAN TURN]
```

### 3.3 Error Paths

| Scenario | Trigger | UX Response |
|---|---|---|
| API unavailable | Network down or server not started | Error banner: "Could not reach the game server. Check that the backend is running." with a "Retry" button; hand stays disabled |
| 410 Gone — session expired | User left the tab for >30 min | Info banner: "Your session expired. Start a new game?" with a "New Game" button |
| 422 / invalid card attempt | Bug in legality enforcement or race condition | Error banner: "That card cannot be played. Please try again."; card snaps back to hand; hand re-enabled |
| 500 Internal Server Error | Backend crash | Error banner: "Something went wrong on the server. Your game progress may be lost." with "New Game" button |

### 3.4 Edge Cases

| Edge Case | UX Handling |
|---|---|
| Bot wins the trick and leads the next trick | After trick-complete pause, show bot lead card animated into the empty trick area at t+400ms before enabling human hand |
| Multiple bot leads before human gets to play (only possible if the first few tricks are all bot-led) | Queue bot card reveals using the same 400 ms cadence; do not enable human hand until all pre-human cards are visualised |
| Human leads every trick (won all previous tricks) | Normal flow; no bot pre-reveal needed at trick start |
| All 4 tricks won by bots in a row | Screen should not feel frozen; always show the "resolving" animation even if outcome is lopsided |
| New Game clicked mid-trick | Prompt: "Abandon this game and start a new one?" with "Continue" and "New Game" buttons (one confirm step; no full modal) |

---

## 4. Interaction State Machine

```
States: idle | game-creating | bidding | human-turn | submitting
      | bots-resolving | trick-complete | round-complete | game-complete | error

idle ──(click New Game)──────────────────────────► game-creating
game-creating ──(API ok)─────────────────────────► bidding
game-creating ──(API error)──────────────────────► error

bidding ──(human selects game type + submit)──────► human-turn
  [Note: v1 skips bot bidding; human always declares]

human-turn ──(click valid card)──────────────────► submitting
human-turn ──(click invalid card)────────────────► human-turn (flash error, no state change)

submitting ──(API ok, trick not complete)─────────► bots-resolving
submitting ──(API ok, trick was already last)─────► bots-resolving → trick-complete
submitting ──(API error)─────────────────────────► error

bots-resolving ──(all bot cards presented)────────► trick-complete
trick-complete ──(1800 ms, tricks remain)─────────► human-turn  [or bots-resolving for bot leads]
trick-complete ──(1800 ms, 8th trick done)────────► round-complete
round-complete ──(click Play Next Round)──────────► game-creating [new round]
round-complete ──(last round, score ≥ 3)XXXXXXXXXX► game-complete
game-complete ──(click New Game)─────────────────► game-creating
error ──(click Retry / New Game)─────────────────► game-creating
```

---

## 5. Visual Feedback Requirements

### 5.1 Turn Indicator

| State | Visual Signal | Location |
|---|---|---|
| `human-turn` | Green pulsing border (CSS `box-shadow` keyframe) on all playable cards; turn banner "Your Turn" in accent green | Above hand section |
| `submitting` | Turn banner changes to "Waiting for bots…" with a 3-dot pulse (CSS animation); hand section `pointer-events: none; opacity: 0.55` | Same banner |
| `bots-resolving` | Trick positions for bots flip from placeholder to card face with a CSS `rotateY(180deg)` card-flip animation (200 ms) | Trick area |
| `trick-complete` | Gold `box-shadow` ring on the winning position; winner label fades in below trick | Trick area |

### 5.2 Bot Card Reveal Timing

```
API response received at t = 0
├── t = 0 ms     Spinner/pulse hidden
├── t = 600 ms   Bot at position N₁ flips card (200 ms flip animation)
├── t = 1000 ms  Bot at position N₂ flips card
├── t = 1400 ms  Bot at position N₃ flips card  
├── t = 1600 ms  All 3 cards visible
└── t = 1800 ms  Trick-complete highlight appears
```

Where N₁, N₂, N₃ are the seats in play order (e.g. if human leads: seq is 1→2→3; if bot 2 leads: seq is 3→0→1 — the human card was already shown on click).

**If the API call takes longer than 600 ms**: the 600 ms timer is reset to use the actual response time + 0 ms offset, ensuring no perceived stutter.

### 5.3 "Bot Thinking" Pulse

- Element: `<div class="bot-thinking-indicator" aria-live="polite">Bot 1 is thinking…</div>`
- Appears: 150 ms after `submitting` state is entered (avoids flash on fast networks)
- Label updates as each bot "plays": "Bot 1 played", "Bot 2 is thinking…", etc.
- Disappears: after the last bot card is placed

### 5.4 Player Labels

| Seat | Label in UI |
|---|---|
| 0 | **You** |
| 1 | **Bot 1** |
| 2 | **Bot 2** |
| 3 | **Bot 3** |

Labels replace "Player 0/1/2/3" throughout the score board, trick positions, and status messages.

### 5.5 Score Board Highlights

- `score-0` (`#score-0`) gets a **blue border** when it is the human's active turn (`human-turn` state)
- Bot rows (`#score-1`, `#score-2`, `#score-3`) get a **grey pulse border** while that specific bot is "thinking" (`bots-resolving` and that bot's card not yet placed)
- Round winner row gets a green background flash (300 ms) at round-complete

### 5.6 Round-Complete Banner

```
┌───────────────────────────────────────────────────────────────────┐
│  Round complete!  ·  Your team: 72 pts  ·  Opponent team: 48 pts │
│  [You WIN this round!  +1 point]                                  │
│                                          [Play Next Round →]      │
└───────────────────────────────────────────────────────────────────┘
```

- Appears inline, replacing the trick area
- Point breakdown visible for all 4 players as expandable "Show details"
- If final game score reached: changes title to "Game Over — You Win! 🎉" / "Game Over — Bots win"

---

## 6. Accessibility Requirements

### 6.1 ARIA Live Regions

All bot actions and state changes that are not visually obvious must be announced to screen readers.

| Event | Live Region ID | Announcement Text | `aria-live` level |
|---|---|---|---|
| Human's turn begins | `#turn-status` | "Your turn. You have N playable cards." | `assertive` |
| Bot X plays a card | `#bot-action-announcer` | "Bot X played [Rank] of [Suit]." | `polite` |
| Trick won | `#trick-result-announcer` | "You win the trick! N points." or "Bot X wins the trick. N points." | `assertive` |
| Round complete | `#round-result-announcer` | "Round over. Your team scored 72 points. Opponent team scored 48 points. You win the round." | `assertive` |
| Error | `#error-announcer` | Full error message text | `assertive` |

All `aria-live` containers must be present in the DOM from page load (even if visually hidden) to ensure screen readers register them before content is injected.

### 6.2 Card Interactivity

- Every card in the human hand: `role="button"` with `aria-label="[Rank] of [Suit], playable"` or `"[Rank] of [Suit], not playable"` as appropriate
- When not human's turn: all cards get `aria-disabled="true"` and `tabIndex="-1"`
- When human's turn: playable cards get `tabIndex="0"`; focus is set to the first playable card automatically on `human-turn` state entry

### 6.3 Keyboard Navigation

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move between playable cards in hand |
| `Enter` / `Space` | Play the focused card |
| `Tab` on "New Game" / "Play Next Round" | Standard button focus |
| `Escape` | Cancel mid-turn "abandon game" prompt (if triggered) |

### 6.4 Focus Management

- On `game-creating` → `bidding`: focus moves to first bidding option
- On `bidding` → `human-turn`: focus moves to first playable card
- On `trick-complete` → `human-turn`: focus moves to first playable card
- On error: focus moves to the error banner's "Retry" or "New Game" button
- Do **not** trap focus; the page structure is simple enough that no focus trap is necessary

### 6.5 Color & Contrast

| Element | Foreground | Background | Contrast ratio (min) |
|---|---|---|---|
| Playable card label | `#1a202c` | `#f0fff4` (green-tinted) | ≥ 7:1 (AAA) |
| Non-playable card label | `#62737e` | `#f9f9f9` | ≥ 4.5:1 (AA) |
| Turn banner "Your Turn" | `#fff` | `#38a169` | ≥ 4.5:1 (AA) |
| Turn banner "Waiting…" | `#374151` | `#f3f4f6` | ≥ 7:1 (AAA) |
| Bot thinking label | `#374151` | `#edf2f7` | ≥ 7:1 (AAA) |
| Error banner | `#fff` | `#c53030` | ≥ 4.5:1 (AA) |

Do not rely on color alone to communicate "playable vs. not playable" — always pair with a visible label or border style change.

### 6.6 Reduced Motion

Wrap all keyframe animations in a `@media (prefers-reduced-motion: reduce)` block that replaces flip/slide animations with an instant `opacity` transition (150 ms). The timing delays (400 ms between bots) remain; only the motion is removed.

---

## 7. Responsive Behavior

### 7.1 Breakpoints (Mobile-First)

| Breakpoint | Layout changes |
|---|---|
| `< 480 px` (phone portrait) | Single-column layout; trick area 2×2 grid; hand cards 60×80 px minimum; "Bot N is thinking" label shows above trick area |
| `480–768 px` (phone landscape / small tablet) | Trick area switches to 1×4 horizontal row; score board collapses to compact 2-column grid |
| `768–1024 px` (tablet) | Two-column layout as current; trick area stays 2×2; hand cards grow to 80×110 px |
| `≥ 1024 px` (desktop) | Three-column layout optional: Scores | Trick + Messages | Hand (below) |

### 7.2 Touch Targets

All card buttons must meet a minimum touch target of **48×48 px** even if the rendered card is smaller (use CSS `padding` or `margin` to extend the hit area without affecting visual size).

### 7.3 Bot Thinking Indicator Placement

- Desktop: renders inline inside the trick section header
- Mobile (< 480 px): fixed-position bar at bottom of viewport, above the hand section, so the user does not need to scroll to see it

---

## 8. Revision Notes: Manual-Play UX → Bot-Assisted UX

### 8.1 What Existed Before (Manual-Play)

| UX Element | Behavior |
|---|---|
| Player hand display | Shows the hand of whoever `currentPlayer` is — cycles through all 4 seats as play progresses |
| Turn detection | `currentPlayer` variable drives whose hand is shown; user clicks for every seat |
| Card interaction | All 4 hands are playable in sequence; no distinction between "human" and "bot" |
| Player labels | "Player 0", "Player 1", "Player 2", "Player 3" throughout |
| Score board active highlight | Highlighted during bidding only |
| Loading states | None — all state changes are synchronous and local |
| Error states | Only `invalid card` inline message |

### 8.2 What Changes (Bot-Assisted)

| UX Element | Change | Reason |
|---|---|---|
| Player hand display | Always shows seat 0's hand only | Human controls seat 0 only; showing bot hands would be a design flaw |
| Turn detection | Replaced by state machine: `human-turn` ↔ `bots-resolving` | Backend is authoritative; frontend derives state from API response |
| Card interaction | Enabled only in `human-turn`; disabled in all other states | Prevents duplicate plays; prevents race conditions |
| Player labels | Seat 0 = "You"; Seats 1-3 = "Bot 1/2/3" | Human-readable; aligns with single-player framing |
| Score board | Active-player highlight visible during `human-turn` AND `bots-resolving` (with per-bot pulsing) | Gives at-a-glance turn tracking even while hand is disabled |
| Loading states | New: `submitting` spinner, `bots-resolving` flip animation | API calls require async feedback |
| Error states | New: network error, session expiry (410), server error (500) | Backend failures must be gracefully surfaced |
| Bidding | Human selects game type; bots do not bid in v1 | Aligned with requirements (A-02) |
| "New Game" button | Must confirm if a game is in progress (`playing` state) | Prevents accidental game abandonment |

### 8.3 New UI Elements Required

| Element | Location | Purpose |
|---|---|---|
| Turn banner (`#turn-banner`) | Above hand section | "Your Turn" / "Waiting for bots…" |
| Bot thinking indicator (`#bot-thinking`) | Trick section header | "Bot N is thinking…" pulse text |
| Game-type selector | Replaces/extends current bid section | Human declares game type before play begins |
| Round-complete banner (`#round-complete-banner`) | Replaces trick area | Score summary + "Play Next Round" CTA |
| Game-complete banner (`#game-complete-banner`) | Full-width, above hand | Final result + "New Game" CTA |
| `aria-live` containers (×5) | In DOM from load, visually hidden | Screen reader announcements |

---

## 9. Component Behavior Specifications

### 9.1 Card Component (Human Hand)

```
States: default | playable | not-playable | selected (mid-play) | disabled (not human turn)

default      → no hover effect; cursor: default
playable     → green border (#48bb78); cursor: pointer; on hover: lift -5px
not-playable → grey border; opacity: 0.5; cursor: not-allowed; no hover lift
selected     → immediately after click: card translates toward trick area (CSS transform)
              card removed from hand DOM after 200 ms (after transition)
disabled     → pointer-events: none; opacity: 0.55; all variants above are overridden
```

### 9.2 Trick Position Component (Seats 0–3)

```
States: empty | occupied | winner-highlighted | resetting

empty              → dashed grey border; placeholder label "You" / "Bot N"
occupied (bot)     → card face visible after flip animation (200 ms rotateY)
occupied (human)   → card slides in from hand area (200 ms translate + scale)
winner-highlighted → gold box-shadow pulse for 1800 ms after trick is complete
resetting          → fade-out (300 ms opacity 0) before clearing for next trick
```

### 9.3 "New Game" Button

```
idle            → enabled; primary style
game-creating   → disabled; spinner icon; "Starting…" label
bidding         → enabled (user can cancel and restart)
human-turn      → enabled; click triggers confirm dialog ("Abandon game?")
submitting      → disabled (prevents double-submit)
bots-resolving  → enabled; click triggers confirm dialog
trick-complete  → enabled; click triggers confirm dialog
round-complete  → secondary style; "Start Over" label
game-complete   → primary style; "New Game" label
```

---

## 10. Open Questions (Documented for Future Confirmation)

These questions were identified but resolved via assumption. A product owner should confirm before a second iteration:

1. **Bot naming**: Should bots have Bavarian persona names (e.g., "Seppi", "Vroni", "Wastl") rather than "Bot 1/2/3"? Assumed: generic names for v1; persona names as an enhancement.

2. **Bot difficulty indication**: Should the UI expose that bots use rule-based heuristics ("Basic AI")? Assumed: not shown in v1; expose when multiple difficulty tiers are introduced.

3. **Card reveal cancellability**: Should the player be able to click "Skip animation" to jump to the final trick state immediately? Assumed: not needed for a 1.4-second animation; reconsider if users report the pacing as frustrating.
