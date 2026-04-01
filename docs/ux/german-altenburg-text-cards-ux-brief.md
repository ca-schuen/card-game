# UX Design Brief: German/Altenburg Text Cards

**Feature**: Replace French-style card visuals with German/Altenburg text-first cards  
**Author**: UI/UX Designer  
**Date**: 2026-04-01  
**Status**: Implemented (reference brief)  
**Related docs**:
- `docs/architecture-german-altenburg-text-cards.md`
- `https://github.com/ca-schuen/card-game/issues/13`

---

## 1. Research Summary (Patterns and Evidence)

This brief is grounded in issue and architecture constraints plus external UX/accessibility guidance.

### 1.1 Card game and text-first pattern findings

- In trick-taking UIs, players scan fast for legal play, trump relevance, and trick winner. Therefore card identity should be a single glance unit: rank + suit label together, never split across distant UI regions.
- Text-first cards reduce ambiguity during transition from one card system to another when terminology is stable and repeated consistently.
- Suit meaning should be reinforced by style (color, badge, border), but style cannot be the only channel.
- Transition changes are easiest when there is an always-available compact reference (old-to-new suit mapping) near gameplay actions.

### 1.2 Readability findings

From NN/g readability guidance:
- Legibility improves with clear type, adequate size, and high foreground/background contrast.
- Users scan before they read deeply, so the first visible words on each card must carry meaning quickly.
- Mobile viewports amplify comprehension cost, so text must be brief and formatted as scannable chunks.

Implication for this feature:
- Primary card line must prioritize rank + German suit word (for example: `O Eichel`) over decorative text.
- Optional support text (alias/help) must be de-emphasized and never required to interpret gameplay.

### 1.3 Accessibility findings

From WCAG understanding docs and game accessibility guidelines:
- SC 1.4.1: Information cannot rely on color alone.
- SC 1.4.3: Body-size text requires at least 4.5:1 contrast.
- SC 2.1.1: All core interactions must be keyboard operable.
- SC 2.4.7: Focus indicator must be visible.
- Interactive elements should remain large and well spaced on touch screens.

Implication for this feature:
- Every card must expose explicit text identity and accessible name.
- Card states must preserve text in idle/hover/focus/selected/disabled/played.
- Keyboard-only play for human card selection is mandatory.

---

## 2. Open Questions Resolved (Assumptions)

No critical ambiguity blocks UX design. To avoid delay, the following assumptions are made and should be validated during implementation review.

| ID | Assumption | Why this is safe now |
|---|---|---|
| A-01 | Canonical visible notation is `Rank + SuitName` using `Eichel`, `Gras`, `Herz`, `Schellen` and ranks `A, 10, K, O, U, 9, 8, 7`. | Matches architecture and issue acceptance criteria; keeps terminology stable. |
| A-02 | Optional migration helper text (French-to-German mapping) is available via a help toggle/link near game controls, not embedded on each card. | Preserves card compactness while satisfying transition-comprehension requirement. |
| A-03 | Cards remain single-tap/single-click actions; no gesture-only interactions are introduced. | Aligns with keyboard parity and current game interaction model. |

---

## 3. User Journey Map

### 3.1 Entry points

| Entry point | Trigger | Initial expectation |
|---|---|---|
| Fresh load | User opens app | User sees text-first German/Altenburg cards in any seeded/demo state or after new game action. |
| New game flow | User clicks New Game | New hand appears using same notation and state styling rules. |
| Returning user from French-style mental model | User resumes after update | User can quickly map old suit expectation to new labels via in-context help reference. |

### 3.2 Happy path (single trick perspective)

```text
[Hand visible]
   -> User scans cards by rank+suit words
   -> User identifies playable set (visual + textual + announced)
   -> User selects one card (click/tap/keyboard)
   -> Selected card state is obvious (not color-only)
   -> Card moves to played area preserving same text label
   -> Trick resolves; winning card identity remains clear via text
   -> Next turn begins with same notation and first playable card focus
```

### 3.3 Error paths

| Scenario | UX behavior |
|---|---|
| Card data missing suit/rank | Render fallback card shell with `Card data unavailable`, block play, show retry/new-game CTA. |
| Notation mapping failure in adapter | Show non-blocking error banner + fallback raw codes (`E`, `A`) so game remains interpretable. |
| Network/API failure on play | Keep selected card in pending visual state briefly, then restore to hand with clear error text and retry path. |
| Conflicting state update | Freeze interaction for affected hand region, announce resync, refresh state and restore focus. |

### 3.4 Edge cases

| Edge case | UX handling |
|---|---|
| Very small viewport | Card layout shifts to compact two-line labels and horizontal scrolling lane with snap points. |
| Long localized/alias text | Card body preserves canonical first line; extra text truncates with tooltip/assistive full label. |
| Color-vision deficiency | Suit differences remain understandable from text and symbols; not dependent on hue. |
| Zoom 200% | Card stack and controls remain operable without loss of essential rank/suit text. |

---

## 4. Interaction Specifications

### 4.1 Card component behavior by action

| User action | Expected behavior | Timing |
|---|---|---|
| Hover on playable card (pointer) | Elevation + border emphasis + unchanged label text | 100-150 ms transition |
| Focus on playable card (keyboard) | High-contrast focus ring and optional subtle scale, no text movement | Immediate on focus |
| Click/tap playable card | Card enters selected/committed state; hand input disabled until response | Immediate visual acknowledgement (<100 ms) |
| Press Enter/Space on focused playable card | Same as click/tap | Immediate |
| Attempt on non-playable card | No move; card shakes slightly and status explains reason | 120-180 ms micro-feedback |

### 4.2 Text hierarchy inside each card

- Primary line: Rank token + suit name (example: `U Gras`).
- Secondary line (optional): expanded spoken form or helper alias (example: `Unter`).
- No decorative element may occlude or replace primary line.

### 4.3 State transition model

```text
idle -> hover/focus -> selectable -> selected -> played -> resolved
                 \-> disabled (when not playable or not user turn)
                 \-> error (if action rejected)
```

Rules:
- Essential text is present in all states.
- Selected and disabled states must differ by more than hue (shape, border style, opacity pattern, icon marker).

---

## 5. Feedback and States

All interactive surfaces must define loading, empty, error, success, and disabled treatment.

### 5.1 Card-level states

| State | Visual | Copy/announcement |
|---|---|---|
| Loading (dealing/refresh) | Skeleton card with reserved text blocks to prevent layout shift | `Loading cards...` (polite live region) |
| Empty (no cards in hand) | Empty hand panel with clear next step | `No cards in hand.` |
| Error (invalid card payload) | Warning border and fallback text | `Card data unavailable` |
| Success (card played) | Played placement confirmation + winner highlight later | `Played: [Rank] [Suit]` |
| Disabled (not playable/not turn) | Reduced emphasis but still legible; lock/disabled marker | `Not playable right now` |

### 5.2 Global game feedback states

| State | Trigger | UX requirement |
|---|---|---|
| Loading game state | New game / sync | Disable hand interactions; show progress copy and skeleton placeholders. |
| Empty game state | No active session | Show start-state panel with New Game primary action. |
| Error state | API or mapping failure | Persistent inline banner with retry action and concise diagnosis text. |
| Success state | Trick/round completion | Text-first outcome summary with team points and winner identity. |
| Disabled global controls | During pending action | Buttons and hand controls indicate disabled reason, not only dimmed style. |

---

## 6. Accessibility Checklist

### 6.1 Semantics and naming

- Card controls use semantic button elements where possible.
- Accessible name format is consistent: `[Rank spoken] [Suit spoken]` (example: `Ober Eichel`).
- If card is not playable, accessible description includes state (`not playable`).

### 6.2 Keyboard and focus

- Full play flow operable with keyboard only.
- Tab order: primary actions -> hand container -> playable cards in visual order -> utility/help controls.
- Enter/Space activates focused playable card.
- Visible focus meets high-contrast requirement and is not removed by script.
- After turn/state refresh, focus returns to first playable card or nearest valid fallback control.

### 6.3 Contrast and non-color reliance

- Card primary text contrast >= 4.5:1 in all interactive states.
- Large labels/badges can use >= 3:1 only if they qualify as large text; otherwise keep >= 4.5:1.
- Selected/playable/disabled differences are conveyed by at least one non-color cue (icon, border pattern, label).

### 6.4 Screen reader and announcements

- Live region announces turn changes, play confirmations, trick winner, and critical errors.
- Announcements are concise and deterministic (no duplicate spam on re-render).
- Help mapping content is reachable by keyboard and readable by assistive tech.

### 6.5 Touch target and spacing

- Card tap targets are comfortably sized for mobile interaction.
- Adjacent cards maintain spacing to avoid accidental taps.

---

## 7. Responsive Behavior (Mobile-First)

### 7.1 Breakpoints and layout expectations

| Viewport | Card presentation |
|---|---|
| Small mobile | Compact two-line card labels, larger tap targets, horizontal hand lane with snap; fixed action bar for essential controls. |
| Large mobile / small tablet | 2-row or widened lane option depending hand size; preserve readable primary line without truncating suit names where possible. |
| Desktop | Wider cards with comfortable spacing and optional helper line visible by default. |

### 7.2 Responsive rules

- Primary line must never be truncated to the point suit identity is lost.
- If truncation is unavoidable, keep full accessible name and show full text on focus/hover.
- Maintain stable card order and interaction model across breakpoints.
- Avoid introducing two-dimensional scrolling for basic hand reading.

---

## 8. Revision Notes (Before/After)

| Area | Before (French-style visual emphasis) | After (German/Altenburg text-first) | Why |
|---|---|---|---|
| Card identity | More dependent on suit icon/color recognition | Explicit rank + German suit text on every card | Faster, less ambiguous recognition and better accessibility |
| Asset dependency | Visual card-face assets in rendering path | No PNG card-face dependency for gameplay meaning | Lower maintenance risk, deterministic rendering |
| State clarity | Some states inferred from color/style | States retain full text + non-color indicators | WCAG-aligned, clearer for all users |
| Transition support | Limited mapping help for users switching systems | In-context mapping helper available without leaving play | Reduces relearning friction |
| Mobile readability | Visual compression risk on small screens | Mobile-first compact text hierarchy and tap-target constraints | Better readability and action confidence |

---

## 9. Handoff Notes

For Frontend Developer:
- Implement cards via semantic text content from the presentation adapter; keep canonical notation centralized.
- Preserve label consistency across hand, trick area, history/log, and score contexts.

For TDD Engineer:
- Add tests for notation consistency, keyboard playability, focus return behavior, and no-color-only state detection.

For Technical Author:
- Update gameplay screenshots and quick reference to show German/Altenburg labels and migration helper.
