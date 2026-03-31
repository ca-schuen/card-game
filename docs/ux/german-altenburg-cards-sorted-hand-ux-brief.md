# UX Design Brief: German (Altenburg) Cards + Sorted Visible Hand

## Scope
Revise the current hand display so the active player sees German-suited Sauspiel cards in an Altenburg-style visual system and always sees their visible hand in a deterministic sorted order.

## 1) User Journey Impact
- Entry point: After New Game, the active player sees an immediately readable 8-card hand instead of a generic dealt-order list.
- Happy path: On each turn, the visible player scans trumps first, then plain suits, and can identify playable cards faster with less suit confusion.
- Turn handoff: When the visible player changes, the next player sees their own hand already sorted in the same pattern; no manual sorting action is needed.
- Error path: Invalid-play feedback remains the same, but sorted grouping reduces rule mistakes by making follow-suit and trump options easier to spot.
- End state: After a card is played, the remaining visible hand reflows in the same sort order without animation-heavy resorting.

## 2) Interaction And Visual Design Recommendations
- Replace French-suit cues with German suit identity throughout the hand and trick area: Eichel, Gras, Herz, Schellen.
- Each card face should show rank plus suit symbol and suit name or short label. Do not rely on a lone symbol.
- Use Altenburg-inspired suit marks rather than French placeholders:
  - Eichel: acorn motif, dark brown or olive accent
  - Gras: leaf motif, green accent
  - Herz: red heart accent
  - Schellen: bell motif, warm gold accent
- Preserve the Sauspiel rank language already used by the rules: 7, 8, 9, U, O, K, 10, A.
- Face cards should read as German cards, not poker cards: Ober and Unter need distinct labels and illustration treatment; King should remain K or Koenig consistently.
- Card layout recommendation:
  - mirrored corner rank and suit marker
  - central suit art or figure art
  - subtle suit-tinted detailing, not full-card color fills
- Playability state should stay visible on sorted cards with the current pattern of emphasis, but use border, elevation, and label treatment in addition to color.
- Keep card proportions closer to traditional playing cards; avoid square tile styling for the final visual treatment.

## 3) Sorting Behavior Definition For The Visible Hand
- Apply sorting automatically whenever a hand is first shown, whenever turn visibility changes, and immediately after the visible player plays a card.
- No manual sort toggle in MVP.
- Sorting should be stable and deterministic: same cards always appear in the same order for the same game state.
- Default visible-hand sort for Sauspiel:
  1. All trumps first
  2. Remaining non-trump suits after trumps
- Trump order for Sauspiel visible-hand sorting:
  1. Ober: Eichel, Gras, Herz, Schellen
  2. Unter: Eichel, Gras, Herz, Schellen
  3. Trump suit Herz: A, 10, K, 9, 8, 7
- Non-trump suit order after trumps:
  1. Eichel: A, 10, K, 9, 8, 7
  2. Gras: A, 10, K, 9, 8, 7
  3. Schellen: A, 10, K, 9, 8, 7
- The rendered order and keyboard focus order must match.
- Optional light-weight affordance: a small hand label such as "Sorted: Trumps, then suits" near the hand title. No extra interaction required.

## 4) Accessibility And Responsive Considerations
- Expose each card with a full accessible name, for example: "Ober of Eichel, trump, playable".
- Do not communicate suits by color alone; keep suit icon plus text label visible.
- Preserve logical left-to-right, top-to-bottom focus order matching the sorted order.
- On turn changes and invalid-play feedback, announce updates through a polite live region.
- Maintain clear focus styling independent of hover.
- Target minimum tap size of 44 by 44 CSS pixels for card hit areas.
- On mobile, preserve the sort grouping visually. Avoid auto-fit behavior that makes suit groups hard to scan.
- Preferred responsive layout for 8 visible cards:
  - desktop: single-row or balanced grouped row with consistent left-to-right order
  - mobile: fixed 4-by-2 layout or horizontal scroll row, but never reorder cards differently from desktop

## 5) Revision Notes
- Current UX: cards are rendered as generic white tiles with French-suit stand-ins and rank-only text; the hand appears in dealt order.
- Revised UX: cards read as German-suited Sauspiel cards with Altenburg-inspired suit cues, German rank semantics, and consistent card-face structure.
- Current UX: players must inspect the whole hand to infer trumps and suit clusters.
- Revised UX: trumps are grouped first and plain suits follow in a fixed order, reducing scan time and play errors.
- Current UX: the visual design implies a generic card game.
- Revised UX: the hand and trick area clearly communicate Bavarian/German deck identity, which aligns the interface with Sauspiel expectations.

## Assumptions
- This brief targets the current simple browser flow where only one active player's hand is visible at a time.
- Sorting is only for presentation of the currently visible hand; it does not change game rules or hidden-player data.