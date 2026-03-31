# Sauspiel MVP Requirements

**Status:** Draft for Requirements Engineer session

## Executive Summary

Sauspiel is a traditional Bavarian 4-player trick-taking card game with bidding and partnership mechanics. The MVP delivers a fully playable, web-based version with simplified rules suitable for first-time players. Players will experience core gameplay: bidding, trick-taking with trump mechanics, partnership calling, and score calculation. The game uses a 32-card deck with two player turns per round (bidding phase) and deterministic trick resolution.

**MVP Scope:** 4 players local (no AI), single round with bidding → game play → scoring, simplified call mechanics, basic card UI.

---

## I. Domain Research: Sauspiel Rules & Standards

### A. Game Overview
Sauspiel (German: "pig game") is played throughout Bavaria, Austria, and parts of Switzerland. It belongs to the Bavarian Tarock family but uses a standard 32-card deck. The game combines:
- **Trick-taking mechanics** (similar to bridge, skat, or tarot games)
- **Bidding system** (declares game type and difficulty level)
- **Partnership dynamics** (player calls for an unknown partner via high card)
- **Determinate scoring** based on card point values and game outcomes

### B. Core Rules Reference
- **Players:** Exactly 4, seated in standard trick-taking positions
- **Deck:** 32 cards (7, 8, 9, 10, J/Ober, Q/Unter, K, A in 4 suits: ♥♦♣♠)
- **Card Hierarchy by Suit:**
  - **Trumps (Hearts ♥ in standard Sauspiel):** Ober E → Ober G → Ober H → Ober S → 10♥ → 9♥ → 8♥ → 7♥
  - **Plain suits:** A > 10 > K > Ober > Unter > 9 > 8 > 7 (Obers from other suits don't appear here; they're trump)
- **Card Points (for final scoring):**
  - Ace: 11 points
  - 10: 10 points
  - King: 4 points
  - Ober: 3 points
  - Unter: 2 points
  - 9, 8, 7: 0 points
  - **Total per round:** 120 points
- **Deal:** 8 cards per player (32 total), typically 3+2 or 2+3 card dealing order varies by region
- **Forehand:** Player left of dealer typically leads first trick

### C. Standard Game Flow
1. **Bidding Phase:** Players bid their game type in turn order, each bid overrides previous
2. **Call Phase:** Declarer announces a card rank (usually an Ace) to identify their partner
3. **Play Phase:** 8 tricks, players must follow suit/trump, highest card wins
4. **Scoring Phase:** Points tallied, game won/lost, bonuses applied

---

## II. MVP Game Flow (Simplified)

### Phase 1: Setup & Deal
- Select 4 players (names/identities)
- Shuffle 32-card deck
- Deal 8 cards to each player (dealer rotates)
- Display each player's hand privately (in web: only active player sees their hand)

### Phase 2: Bidding (Simplified)
**Rule Simplification for MVP:** Single pass-or-bid model
- **Forehand opens:** Announces game type (Sauspiel, Wenz, Solo) or "Pass"
- **Other players:** Each can "Pass" or override with a higher bid
- **Bids ranked:** Pass < Sauspiel < Wenz < Solo (Solo is highest)
- **No suit selection for Solo in MVP:** Solo defaults to Hearts
- **Winner:** Player with highest bid becomes **Declarer**

### Phase 3: Card Calling (Declarer Announces Partner)
- **Declarer calls a card rank** (typically Ace, optionally King or Ober)
- **Who holds the called card becomes their partner** (revealed after first trick containing that card)
- **Special case:** If Declarer holds the called card, they play solo (no partner bonus)
- Player who plays the called card is now the Declarer's partner (announced mid-game when played)

### Phase 4: Trick-Taking (8 Tricks)
1. **Forehand leads** (plays first card of trick)
2. **Other players must:**
   - Follow suit if possible; else
   - Play trump if possible; else
   - Play any card
3. **Trick winner:** Highest trump in trick OR highest card of led suit if no trump played
4. **Winner leads next trick**
5. **Repeat for 8 tricks**

### Phase 5: Scoring & Endgame
- **Points tallied:** Sum card points won by each player
- **Game result:** Declarer team vs. Opposition team
  - **Target:** Declarer team needs ≥61 points to win game (win majority of 120-point deck)
  - **Declarer team wins:** Base score 1 point, times multiplier for game type
  - **Opposition wins:** Opposition scores points instead
- **Scoring multipliers (MVP):**
  - Sauspiel: 1× (base)
  - Wenz: 2×
  - Solo: 3×
- **Bonuses (if applicable):** Schneider (opponent <31 pts), Schwarz (opponent wins 0 tricks)—simplified for MVP; may exclude
- **Round summary:** Show winner, points, multiplier, final score

---

## III. Detailed Requirements

### 3.1 Game Rules & Mechanics

#### Bidding System
**Requirement:** Players bid in turn order (Forehand → Player 2 → Player 3 → Player 4 → back to Forehand), each bid overriding prior, until three consecutive passes.
- **Bids (MVP):** 
  - Pass
  - Sauspiel (1 multiplier)
  - Wenz (2 multiplier)
  - Solo (3 multiplier)
- **Acceptance Logic:** New bid > previous bid OR all previous players have passed
- **Outcome:** Highest bidder becomes Declarer, others are Opposition
- **Edge case:** All players pass → dealer plays automatic Sauspiel or round declared no-game (MVP: auto-Sauspiel)

#### Partnership Calling (Sauspiel/Wenz only)
**Requirement:** After bidding, Declarer calls one card rank to identify their partner.
- **Callable ranks (MVP):** Ace, optionally King or Ober
- **Calling mechanics:**
  - Declarer announces: "I call the Ace of [suit]" OR just "Ace" (all suits until found)
  - Card may be in any player's hand or already dealt to Opposition
  - If Declarer holds the called card, they play solo (no partner; Opposition is two players)
  - When the called card is played in a trick, that player is revealed as partner
  - Partners share points at endgame
- **Solo games:** No call needed; Declarer always plays 1v3

#### Trick-Taking & Card Play
**Requirement:** Deterministic trick resolution engine.
- **Leading:** Forehand leads first; winner of each trick leads next
- **Card play order:** Goes in turn order from leader
- **Must-follow rules:**
  - Must follow suit of led card if you have that suit
  - If no suit, must play trump if you have it
  - If neither suit nor trump available, play any card
- **Trick-winning logic:**
  - If any trump played, highest trump wins
  - Else, highest card of originally led suit wins
- **Trump order (for MVP—standard Sauspiel):**
  - Ober E (rank 1)
  - Ober G (rank 2)
  - Ober H (rank 3)
  - Ober S (rank 4)
  - 10♥, 9♥, 8♥, 7♥ (all Hearts except Obers, which are trump separately)
  - Non-Hearts Untens are not trump; they're regular cards in their suit

#### Scoring Calculation
**Requirement:** Deterministic points calculation and win/loss logic.
- **Card point values:** As per CARD_POINTS object in existing code
- **Trick point collection:** Each player accumulates points from tricks they won
- **Team scoring (Sauspiel/Wenz):** Declarer + Partner points vs. Opposition total
- **Game win condition:** Declarer team ≥61 points (majority)
- **Final score multiplier:** 
  - Base score = 1 if Declarer team ≥61 else 0 (pending MVP decision on close games)
  - Multiplied by game type (Sauspiel=1×, Wenz=2×, Solo=3×)
  - Applied to winner's total; loser gets 0
- **Schneider (optional for MVP):** If one team <31 points, multiply by additional factor (2×)
- **Schwarz (optional for MVP):** If one team wins 0 tricks, multiply by additional factor (3×)

#### Edge Cases
- **All players pass initial bid:** MVP handles by auto-declaring Forehand in Sauspiel
- **Called card never played:** Declarer plays entire game solo (call ignored)
- **Declarer holds called card:** Declarer plays solo; Opposition is 2v1 (treated as 2-player Opposition team)
- **Tied trick (impossible):** Highest card rule ensures single winner

### 3.2 Bidding System Details

**MVP Bidding Model (Simplified):**
- **Bid sequence:** Forehand opens, each other player can pass or bid higher
- **Bid values:** Pass (0) < Sauspiel (1) < Wenz (2) < Solo (3)
- **Resolution:** Three consecutive passes ends bidding, highest bidder is Declarer
- **Alternative (simpler for MVP):** Single round of bidding, fixed turn order
- **No doubling/redoubling** in MVP (standard Sauspiel feature, excluded for simplification)

**Acceptance criteria:**
1. Players bid in sequential turn order
2. Each new bid must be higher than previous (or previous player passed)
3. Bidding ends when three consecutive players pass
4. Declarer announced to all players

### 3.3 Trick-Taking & Card Play Requirements

**UI Interaction (web):**
- Active player sees their 8 cards in hand
- On their turn, they click/tap a card to play
- Invalid cards (suit not followed, trump available but not played) shown with visual feedback (disabled/grayed)
- Card played appears in trick display area
- Once all 4 players have played, trick resolves automatically

**Card Play Logic:**
1. Validate card is in player's hand
2. Verify suit/trump rules enforced
3. Record card played in trick
4. When trick complete (4 cards), determine winner
5. Award trick points to winner
6. Lead next trick from winner
7. After 8 tricks, end game, calculate team points

### 3.4 Scoring Calculation Requirements

**Comprehensive scoring flow:**
1. After 8 tricks, gather all tricks won by each player
2. Sum card points per trick (all 4 cards' points added to trick winner)
3. Assign to teams:
   - If Sauspiel/Wenz: Declarer + Partner vs. Other two players
   - If Solo: Declarer vs. Other three players combined
4. Determine game winner:
   - Declarer team ≥61 points → Declarer team wins
   - Else → Opposition wins
5. Calculate score:
   - Base: 1 point (or scale as designers prefer)
   - Multiply by game type factor (Sauspiel=1, Wenz=2, Solo=3)
   - Apply Schneider/Schwarz multiples if enabled (optional MVP)
6. Award final score to winning team

**Example (Sauspiel, Declarer team scores 75 points):**
- Declarer team wins (75 ≥ 61)
- Base score: 1
- Game type: Sauspiel (1×)
- Final score: 1 × 1 = 1 point for Declarer team
- Opposition: 0 points

### 3.5 Win Conditions

**Single Round (MVP):**
- Declarer team wins if team points ≥61
- Opposition wins if Declarer team <61 points
- Scores displayed, round ends

**Multi-round (future):**
- First team to reach X cumulative points (e.g., 50 points) wins match
- Not in MVP scope

### 3.6 Bidding & Game Types

**Available Game Types (MVP):**
1. **Sauspiel** (standard)
   - Trump: Hearts
   - Obers from all suits are trump (highest)
   - Declarer calls for partner via card rank
   - Multiplier: 1×
2. **Wenz**
   - Trump: Only Obers (E, G, H, S) in order
   - No Unters as trump (only Obers)
   - Points worth 2× base
   - Multiplier: 2×
3. **Solo**
   - Trump: One suit chosen by Declarer (MVP: defaults to Hearts)
   - Declarer plays alone vs. three opponents
   - No call needed
   - Multiplier: 3×

---

## IV. UI/UX Requirements

### 4.1 Game Display Layout
- **Player hands:** Only active player sees their 8 cards (digital privacy)
- **Trick display:** Central area shows current trick (4 card slots for led card → Player 2 → Ober 3 → Player 4)
- **Bid history:** Display who bid what in sidebar or top banner
- **Score tracker:** Show Declarer team vs. Opposition points during play
- **Game state indicator:** Show current round, trick number (1–8), current phase text (Bidding / Calling / Play Tricks 1–8 / Scoring)

### 4.2 Player Interaction
- **Bidding phase:** Radio buttons/buttons for Pass / Sauspiel / Wenz / Solo
- **Calling phase:** Dropdown or buttons to select card rank (Optional MVP: only Ace callable)
- **Card play:** Click card in hand to play; invalid moves disabled or error message shown
- **Card display:** Show suit symbols (♥ ♦ ♣ ♠) and rank (A, K, 10, 9, 8, 7, O/Ober, U/Unter)

### 4.3 State Displays
- **Scoreboard:** After each round, show:
  - Winning team
  - Team point totals (Declarer vs. Opposition)
  - Game type & multiplier
  - Final score awarded
- **Trick review:** Optional: allow player to see previous tricks played
- **Partner reveal:** When called card is played, announce partner identity

### 4.4 MVP Simplifications (UI)
- No hand sorting/organization (players sort manually in mind)
- No undo moves
- No game history/replays
- No AI opponents (all 4 players required manually)
- Single round only (new setup for next round)

---

## V. Data Structures & Technical Dependencies

### 5.1 Core Game State
```
GameState {
  phase: "setup" | "bidding" | "calling" | "play" | "scoring"
  players: [{id, name, hand, Team}, ...]
  currentBid: {player, bidType: Sauspiel|Wenz|Solo, multiplier}
  declarer: Player
  declarerTeam: [Player, Partner?(revealed late)] | [Player] (solo)
  calledCard: {suit?, rank?} | null
  trump: Suit | {oberOrder: [...]}
  tricks: [{led: Card, played: [Card, Card, Card], winner: Player}, ...]
  currentTrick: {led: Card?, played: {[playerId]: Card}}
  scores: {team1: points, team2: points}
}
```

### 5.2 Dependencies
- **Game rules engine:** Existing `gameRules.js` provides:
  - Deck creation (`createLongDeck()`)
  - Card dealing (`dealCards()`)
  - Card validation (`isValidCard()`)
  - Card points (`getCardPoints()`)
  - Trump suit mapping (`getTrumpSuit()`)
  - **Needs augmentation for:** Trick resolution, bidding logic, partner calling, scoring calculation
- **UI Framework:** React, Vue, or vanilla JS (not specified; recommend React for state management)
- **Networking (optional for MVP if single-browser 4-player):** None (local state)
- **Testing:** Jest + existing test structure (`tests/gameRules.test.js`)

### 5.3 Card Representation
```
Card {
  suit: "E" | "G" | "H" | "S"  // Eichel, Gras, Herz, Schellen (or ♣ ♦ ♥ ♠)
  rank: "7" | "8" | "9" | "10" | "U" | "O" | "K" | "A"
}
```

---

## VI. Non-Functional Requirements

### Performance
- Bidding → card play response time: <500ms (user input to UI update)
- Trick resolution: Instant (deterministic, no calculation delay)
- Scoring calculation: <100ms

### Usability
- New player learns full game in <5 minutes of UI exploration
- Clear visual error messages for invalid card plays (e.g., "You have ♥, must follow suit")
- Player turn indicator (bold name or highlight)
- Card suit/rank always clearly readable (large font, distinct symbols)

### Accessibility (stretch MVP)
- Keyboard navigation (arrow keys to select card, enter to play)
- Screen reader support for game state narration
- High-contrast color option

### Browser Compatibility
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile responsive (touch-friendly card selection)

---

## VII. Out of Scope (for MVP Clarification)

- ❌ AI opponents (all 4 players must be human-controlled)
- ❌ Doubling/Redoubling (complex bidding variant)
- ❌ Multiple rounds / tournament mode
- ❌ Chat/messaging between players
- ❌ Game undo/rewind
- ❌ Hand sorting/optimization suggestions
- ❌ Animated card transitions (static display acceptable)
- ❌ Sound effects
- ❌ User authentication / persistent accounts
- ❌ Backend/server (single local session assumed)
- ❌ Solo suit selection (defaults to Hearts)
- ❌ Schneider/Schwarz bonuses (advanced scoring, can be added post-MVP)

---

## VIII. Acceptance Criteria

A complete MVP must satisfy:

### Bidding Phase
- [ ] 4 players can each bid Pass / Sauspiel / Wenz / Solo in turn order
- [ ] Highest bid determines Declarer
- [ ] All three identical bids pass → Declarer does Sauspiel
- [ ] Bid state visible to all players

### Partner Calling (Sauspiel/Wenz)
- [ ] Declarer can call Ace (mandatory) or King (if MVP extended)
- [ ] Called card triggers partner reveal when played
- [ ] Solo games skip calling phase

### Trick-Taking
- [ ] Forehand leads first trick
- [ ] Trick winner determined by trump rank or suit rank
- [ ] Player must follow suit if able
- [ ] Player must play trump if suit unavailable
- [ ] All 8 tricks complete without error

### Scoring
- [ ] Card points correctly summed per trick
- [ ] Team points aggregated (Declarer + Partner vs. Opposition)
- [ ] Declarer team with ≥61 points wins game
- [ ] Final score calculated with multiplier
- [ ] Scorecard displays winner and points

### UI/UX
- [ ] Only active player's current turn shows valid playable cards
- [ ] Invalid card plays blocked with clear message
- [ ] Game phase (Bidding/Calling/Play/Scoring) always visible
- [ ] Score and trick progress shown at all times
- [ ] Game ends with summary screen

### Code Quality
- [ ] Existing `gameRules.test.js` passes
- [ ] New game mechanics have 90%+ unit test coverage
- [ ] No ESLint errors (`npm run lint` passes)
- [ ] README documents how to play

---

## IX. Questions for Organizer/Stakeholder

1. **Closing the deal / Going-out rule:** Standard Sauspiel allows player to "close" trump suit after 6 tricks. Should MVP include? → **Likely NO (too complex)**

2. **Schneider/Schwarz multipliers:** Bonuses if opponent <31 pts or wins 0 tricks. Include in MVP? → **Likely NO (defer to v1.1)**

3. **Solo suit selection:** Should Solo player pick trump suit or default to Hearts? → **Defer to post-bidding UI or default Hearts for MVP**

4. **Multiple rounds / match score:** Should MVP allow clicking "Play Again" or is single round sufficient? → **Single round focus vs. tournament mode**

5. **Card naming localization:** Use German names (Ober/Unter/Herz) or English (Jack/Pip/Hearts)? → **TBD based on UI design**

---

## Summary

This requirements document defines a pragmatic Sauspiel MVP with simplified bidding, deterministic partnership calling, and rule-compliant trick-taking. The game delivers a complete play experience (bidding → play → score) in a single round, suitable for local 4-player sessions. Focus remains on core mechanics and clear UI, deferring advanced features (AI, multi-round tournaments, complex scoring) to post-MVP releases. The foundation leverages existing game rules code and extends it with bidding, partnership, and scoring engines.

**Estimated scope:** 3–4 sprints for full implementation (bidding → calling → trick engine → scoring → UI polish).
