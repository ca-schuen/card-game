# Architecture Note: German (Altenburg) Cards + Sorted Visible Hand

## Context

The current Sauspiel MVP renders cards as generic rank tiles with French-suit stand-ins and shows the visible player's hand in deal order. This diverges from the game's German deck identity and makes it harder for players to scan trumps and follow-suit options.

## Decision

- Keep the existing card data model unchanged: cards remain `{ suit, rank }` with suits `E`, `G`, `H`, `S` and ranks `7`, `8`, `9`, `U`, `O`, `K`, `10`, `A`.
- Add presentation helpers in the rules layer for deterministic Sauspiel hand sorting and German-suit display metadata.
- Render the visible hand from a sorted view instead of the raw hand order, but translate clicks back to the original hand index so game state mutations remain correct.
- Replace French-suit visual treatment in the UI with German-suited Altenburg-inspired card faces using HTML/CSS only.

## Affected Areas

- `src/gameRules.js`
  - add sort/display helpers without changing trick or scoring logic
- `src/game.js`
  - render sorted visible-hand views
  - map rendered cards back to original hand indices when played
  - expose richer card labels for accessibility
- `src/style.css`
  - introduce German-suited card-face styling and responsive hand layout updates
- `tests/gameRules.test.js`
  - verify deterministic Sauspiel visible-hand sorting
- `tests/game.test.js`
  - verify UI-facing hand sorting helpers and display metadata behavior

## Rationale

- Keeping the core card model stable avoids churn in trick resolution and scoring logic.
- Sorting in a helper keeps presentation rules centralized and testable.
- Rendering from a derived view preserves existing game rules while allowing the UI to present cards in a player-friendly order.
- CSS-based German suit treatment is sufficient for MVP and avoids adding image assets or a build pipeline.

## Trade-offs

- The rendered order no longer matches array order in `playerHands`, so the UI must carry original indices with each rendered card.
- Altenburg styling will be suggestive rather than historically exact because the app currently uses lightweight DOM/CSS cards, not illustrated assets.

## Testing Implications

- Add unit coverage for the Sauspiel sort order: trumps first, then plain suits in fixed order.
- Add UI-oriented coverage for generated German suit labels and for preserving play correctness when the visible hand is sorted.