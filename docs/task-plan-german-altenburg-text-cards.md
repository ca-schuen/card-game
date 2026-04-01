# Task Plan: German/Altenburg Text Cards (Issue #13)

## Implementation Outcome (Frontend)

Implemented in current branch:
- Text-first German/Altenburg card rendering in gameplay surfaces (hand and current trick).
- Shared presentation mapping helper (`src/cardPresentation.js`) for suit/rank labels, aria labels, and semantic suit classes.
- Migration mapping helper shown in status area (`index.html`).
- Readability and accessibility support in styles and markup:
  - Visible keyboard focus for interactive cards.
  - Non-color state cues via state labels (`Playable` / `Not playable`).
  - Responsive card text sizing for smaller screens.

Not changed by this feature:
- Core game rules and scoring logic contract.
- Canonical card model at boundaries (`suit`, `rank`).

## 1. Scope Summary
Implement a frontend-only migration from French-style visual card rendering to German/Altenburg text-first cards, with no PNG card-face dependency in gameplay rendering.

In scope:
- Keep canonical card model unchanged: `suit` in `E|G|H|S`, `rank` in `A|10|K|O|U|9|8|7`.
- Add/standardize a frontend presentation adapter that maps canonical cards to canonical text labels and accessibility names.
- Render card identity as explicit text in all gameplay surfaces (hand, played trick, and any card display context).
- Ensure keyboard operability, visible focus, non-color-only state cues, and responsive readability.
- Add migration helper/reference content for users transitioning from French-style terminology.
- Add test coverage and CI verification.

Out of scope:
- Game rule changes, trick resolution changes, trump logic changes.
- Backend API contract changes for card payload.
- Decorative historical artwork fidelity and localization beyond canonical German labels.

## 2. Acceptance Criteria List
1. Gameplay uses no PNG card-face assets for card identity rendering.
2. Card model remains unchanged at logic/API boundaries (`suit`, `rank` only).
3. Each card visibly shows canonical notation as `Rank + SuitName` (for example `O Eichel`, `10 Herz`).
4. Canonical suit labels are exactly `Eichel`, `Gras`, `Herz`, `Schellen`.
5. Canonical rank tokens are exactly `A, 10, K, O, U, 9, 8, 7`.
6. A single presentation mapping policy is reused across all card surfaces to prevent naming drift.
7. Cards have consistent accessible names in spoken format (for example `Ober Eichel`, `Ass Herz`).
8. Card meaning is never color-only; text identity remains visible in idle, hover/focus, selected, disabled, and played states.
9. Keyboard-only play is supported: tab/focus on playable cards and Enter/Space activation.
10. Focus indicator is visible and high contrast on interactive cards.
11. Mobile layout keeps primary card identity readable and tappable on narrow viewports.
12. If mapping fails or card payload is invalid, fallback rendering keeps the game interpretable (at minimum raw codes) and shows clear error messaging.
13. Existing game rules and backend behavior remain regression-free.
14. Local quality gates pass: lint and tests; CI pipeline passes for the branch.

## 3. Work Breakdown By Area

### Frontend (Owner: Frontend Developer)
- Implement/confirm `CardPresentationAdapter` module with a deterministic mapping contract:
  - Input: canonical `{ suit, rank }`.
  - Output: `rankText`, `suitText`, `shortLabel`, `ariaLabel`, `semanticClass`, stable `id`.
- Refactor card rendering seam to consume presentation model only.
- Apply canonical text rendering to all UI surfaces where cards appear (hand, trick/play area, status/history if present).
- Update card state styles to preserve text visibility in all interaction states.
- Add non-color cues for selected/playable/disabled states (border/icon/pattern).
- Ensure responsive behavior (small mobile to desktop) without losing essential suit identity.
- Add a compact mapping helper entry point in UI near gameplay controls.
- Add fallback UI paths for invalid/missing card data and mapping failure.

Complexity: Medium
Dependencies: none (can start immediately)

### Backend (Owner: Backend Developer, if needed)
- Verify no API contract changes are required for Issue #13.
- Confirm backend integration tests remain green with unchanged payload shape.
- Only if frontend discovers payload inconsistency: add minimal contract hardening/validation without changing shape.

Complexity: Low
Dependencies: frontend validation feedback (conditional)

### Testing (Owner: TDD Engineer)
- Add/extend unit tests for presentation adapter mapping across full 32-card set.
- Add UI/unit tests for rendering contract consistency across card surfaces.
- Add interaction tests for keyboard flow, focus visibility, and disabled/playable behavior.
- Add regression tests proving no game-rules behavior changes.
- Add tests for error/fallback states (invalid payload, adapter failure path).
- Add responsive assertions for primary label visibility in mobile breakpoints.

Complexity: Medium-High
Dependencies: frontend adapter and renderer updates

### Documentation (Owner: Technical Author)
- Update README or gameplay docs to describe German/Altenburg notation.
- Document migration helper and canonical mapping reference.
- Update screenshots/examples to text-first cards (no PNG identity dependency).
- Capture any accessibility and keyboard interaction notes for players/testers.

Complexity: Low-Medium
Dependencies: final UI text and interaction behavior

### CI/Operations (Owner: Ops CI Engineer)
- Validate branch quality gates and CI workflows.
- Analyze any CI failures and post remediation guidance.
- Confirm test suite runtime and flakiness are acceptable after added coverage.

Complexity: Low
Dependencies: implementation + tests completed

### Suggested Task Sequence And Dependencies
1. Frontend Developer: adapter + renderer + state styling foundations.
2. Frontend Developer: responsive and fallback/error handling.
3. TDD Engineer: mapping, UI interaction, and regression tests.
4. Backend Developer (conditional): only if payload mismatch is uncovered.
5. Technical Author: docs/screenshot/reference updates.
6. Ops CI Engineer: CI diagnostics and pass confirmation.

## 4. Risks And Mitigations
- Risk: Inconsistent naming across hand/trick/other views.
  - Mitigation: enforce one adapter and shared notation constants; add contract tests per surface.
- Risk: Reintroduction of color-only signaling in state styles.
  - Mitigation: acceptance checks for non-color cues; explicit accessibility test assertions.
- Risk: Mobile readability regressions with long labels.
  - Mitigation: mobile-first layout rules, minimum font/spacing constraints, viewport tests.
- Risk: User confusion during transition from French terminology.
  - Mitigation: in-context mapping helper and consistent canonical labels everywhere.
- Risk: Hidden logic regression while refactoring card rendering.
  - Mitigation: keep logic contract unchanged; run full rules regression tests.
- Risk: CI instability due to expanded UI test coverage.
  - Mitigation: deterministic fixtures, remove timing-sensitive assertions, monitor flakiness in CI.

## 5. Recommended Test Cases

### Mapping And Contract Tests
1. `maps_all_32_cards_to_canonical_text_labels`.
2. `builds_consistent_aria_labels_for_all_ranks_and_suits`.
3. `produces_stable_card_id_for_same_input`.
4. `handles_unknown_suit_or_rank_with_fallback_codes`.

### Rendering And State Tests
1. `renders_rank_and_suit_text_in_hand_cards`.
2. `renders_same_notation_in_played_trick_cards`.
3. `preserves_text_identity_in_idle_hover_focus_selected_disabled_played_states`.
4. `uses_non_color_indicator_for_disabled_and_selected_states`.

### Interaction And Accessibility Tests
1. `supports_keyboard_selection_with_enter_and_space`.
2. `shows_visible_focus_on_playable_card`.
3. `announces_play_confirmation_and_turn_changes`.
4. `keeps_non_playable_cards_non_interactive_with_reason_text`.

### Responsive And Error Tests
1. `maintains_primary_label_readability_on_small_mobile_breakpoint`.
2. `keeps_tap_targets_usable_on_mobile`.
3. `shows_fallback_card_and_error_when_payload_invalid`.
4. `recovers_from_mapping_failure_without_game_crash`.

### Regression Tests
1. `game_rules_outputs_unchanged_for_existing_scenarios`.
2. `legal_move_filtering_unchanged_after_ui_refactor`.
3. `trick_resolution_and_scoring_unchanged`.

## Delegation Checklist
- [ ] Frontend Developer: adapter + renderer + state and responsive updates complete.
- [ ] TDD Engineer: all mapping/UI/accessibility/regression tests added and passing.
- [ ] Backend Developer: no-change verification complete (or minimal compatibility fix merged).
- [ ] Technical Author: docs and references updated.
- [ ] Ops CI Engineer: CI green with diagnostics posted for any failures.
