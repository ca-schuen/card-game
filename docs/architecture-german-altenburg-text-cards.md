# Architecture Design: German/Altenburg Text Cards (No PNG Assets)

**Status**: Implemented (Frontend)  
**Date**: 2026-04-01  
**Author**: Software Architect  
**Related Issue**: #13 (Replace French deck visuals with German/Altenburg text cards)

---

## 1. Executive Summary

This design replaces visual French-style card faces with German/Altenburg text-first card rendering in the frontend while preserving existing game logic and backend behavior. The recommended architecture is a **semantic text-card component pipeline**:

1. Keep canonical game card identity as `{ suit, rank }` (`E|G|H|S`, `A|10|K|O|U|9|8|7`).
2. Add a frontend-only **card presentation adapter** that maps canonical identity to canonical German labels and accessibility text.
3. Render cards as pure HTML/CSS text components (no PNG/raster dependency).
4. Apply a notation policy and state styling rules that preserve readability in all states (idle, hover/focus, selected, disabled, played).

This approach best balances implementation complexity, maintainability, testability, UX fidelity, and delivery risk for the current codebase.

Implementation snapshot (Issue #13):
- Frontend mapping helper implemented in `src/cardPresentation.js` via `toCardPresentation(card)`.
- Card rendering in `src/game.js` now consumes presentation output (`shortLabel`, `ariaLabel`, `semanticClass`) for hand and trick surfaces.
- Gameplay card identity is text-first in HTML/CSS (no PNG card-face identity path).
- UI migration helper text is present in `index.html` and styled in `src/style.css`.
- State/readability support includes visible focus (`:focus-visible`), non-color state labels (`data-state-label`), and responsive text sizing.

---

## 2. Problem Statement And Constraints

### Problem

Current UI card rendering is visually oriented around generic suit classes and compact rank text. Issue #13 requires a domain-authentic German/Altenburg representation that is text-first and does not rely on PNG card-face assets.

### Hard Constraints

- No card-face PNG assets in gameplay rendering path.
- Card identity must be explicit text (rank + suit name), not color-only.
- Preserve game rules and outcomes (no logic changes to trick resolution, trump, legality).
- Keep compatibility with current backend and frontend card model.
- Maintain usable rendering across desktop/mobile.

### Existing Contract Baseline (from code)

- Frontend and backend currently exchange cards in canonical form:
  - `card.suit`: `E | G | H | S`
  - `card.rank`: `A | 10 | K | O | U | 9 | 8 | 7`
- Game rules in `src/gameRules.js` already operate on this canonical model.
- UI currently uses `createCardElement(card)` in `src/game.js` as the rendering seam.

---

## 3. Research Findings Relevant To Architecture

### 3.1 Domain Semantics

- German-suited representation for this project context should use:
  - Suits: Eichel, Gras, Herz, Schellen
  - Ranks: A, 10, K, O, U, 9, 8, 7
- Regional aliases may exist (for example, Sau), but one canonical in-product notation should be enforced for consistency.

### 3.2 Accessibility And Usability Guidance

- Card meaning must not rely on color only (WCAG 1.4.1).
- Text should remain text rather than being embedded in image assets (WCAG 1.4.5 intent).
- Interactive cards require visible focus and keyboard operability (WCAG 2.1.1, 2.4.7).
- Compact labels must remain legible in constrained mobile viewports.

### 3.3 Proven UI Architecture Pattern

For trick-taking card UIs with stable game logic, the lowest-risk pattern is:

- Keep game-domain data canonical and compact.
- Add a presentation mapping layer for naming, aria labels, and style tokens.
- Keep rendering component stateless and derived from props/state.

This isolates domain logic from visual evolution and reduces regression risk.

---

## 4. Alternatives Considered

### Alternative A: Direct Inline Mapping In Existing Card Renderer

**Description**  
Modify `createCardElement(card)` to directly assemble visible text (`rank + suitName`) and style classes, without introducing additional abstraction layers.

**Pros**

- Smallest change surface.
- Fastest path for initial delivery.
- No additional files/components required.

**Cons**

- Presentation logic tightly coupled to rendering function.
- Harder to test notation policy independently.
- Increased risk of duplicated mapping logic in other card surfaces (hand, trick, history).

---

### Alternative B: Presentation Adapter + Reusable Text Card Component (Recommended)

**Description**  
Introduce a dedicated `CardPresentationAdapter` (or equivalent module) that maps canonical card identity to a normalized UI model (display label, full suit label, optional abbreviation, aria label, semantic classes). Rendering code consumes only this view model.

**Pros**

- Clear separation of concerns (domain vs presentation).
- High testability for notation consistency.
- Scales to all surfaces (hand, trick, logs, overlays) with one policy.
- Minimizes risk of accidental logic drift in game rules.

**Cons**

- Slightly higher upfront structure than inline approach.
- Requires explicit contract definition and tests for adapter.

---

### Alternative C: SVG-Based Programmatic Card Faces (Text In SVG, No PNG)

**Description**  
Generate card faces as inline SVG elements containing text nodes for rank/suit and optional decorative vector motifs.

**Pros**

- Precise visual control and scalable vector output.
- No PNG dependencies.
- Strong theming capability.

**Cons**

- More complex rendering and accessibility handling.
- Harder to keep semantic text simple for assistive tech if over-designed.
- Higher implementation and test complexity for limited business gain.

---

### Alternative D: Custom Element/Web Component For Cards

**Description**  
Implement a framework-agnostic `<german-text-card>` custom element with attributes for suit/rank/state.

**Pros**

- Strong encapsulation and reusable API.
- Potential portability to future views.

**Cons**

- Overhead relative to current plain JS architecture.
- Additional compatibility/testing concerns.
- Adds platform complexity not needed for current scope.

---

## 5. Trade-Off Matrix

Scoring scale: `1 (worst)` to `5 (best)`.

| Alternative | Complexity (lower is better to deliver) | Maintainability | Testability | UX Fidelity | Risk (lower delivery risk = higher score) | Weighted Total |
|---|---:|---:|---:|---:|---:|---:|
| A. Inline mapping in renderer | 5 | 2 | 2 | 3 | 3 | 3.00 |
| B. Adapter + reusable text card component | 4 | 5 | 5 | 5 | 5 | **4.80** |
| C. SVG programmatic faces | 2 | 3 | 3 | 5 | 2 | 3.05 |
| D. Web component custom element | 2 | 4 | 4 | 4 | 2 | 3.20 |

Weights used:

- Complexity: 20%
- Maintainability: 25%
- Testability: 20%
- UX fidelity: 20%
- Risk: 15%

Weighted total formula:

$$
\text{Total} = 0.20C + 0.25M + 0.20T + 0.20U + 0.15R
$$

---

## 6. Recommended Architecture

Choose **Alternative B: Presentation Adapter + Reusable Text Card Component**.

### Why This Is The Best Fit

- Preserves existing game model and rules logic untouched.
- Centralizes notation policy and prevents divergence across UI surfaces.
- Enables deterministic unit tests for mapping and card text semantics.
- Supports future UX changes (aliases/tooltips/localization) without domain impact.
- Meets no-PNG requirement with straightforward HTML/CSS implementation.

---

## 7. Component-Level Design

### 7.1 Proposed Frontend Components

1. **Card Presentation Adapter (new module)**
   - Input: canonical card `{ suit, rank }`.
   - Output: presentation model with canonical display fields.
2. **Text Card Renderer (existing seam in UI)**
   - Consumes presentation model.
   - Produces semantic DOM for hand and trick surfaces.
3. **Notation Policy Constants (new or colocated)**
   - Single source for suit/rank labels and abbreviations.
4. **State Styling Layer (CSS)**
   - Explicit visual states that never hide essential text.

### 7.2 Logical Diagram

```text
Game State / API Response
  -> card { suit, rank }
  -> CardPresentationAdapter
      -> { rankText, suitText, shortLabel, ariaLabel, semanticClass }
  -> Text Card Renderer (hand/trick/history)
  -> DOM + CSS state styling (idle/focus/disabled/played)
```

### 7.3 Data Contract Between Game Logic And UI

#### Keep Canonical Domain Contract Unchanged

```json
{
  "suit": "E",
  "rank": "A"
}
```

No rule-layer changes are needed in frontend `src/gameRules.js` or backend game engine for this feature.

#### Introduce UI Presentation Contract (derived, frontend-local)

```json
{
  "id": "EA",
  "rankText": "A",
  "suitText": "Eichel",
  "shortLabel": "A Eichel",
  "ariaLabel": "Ass Eichel",
  "suitCode": "E",
  "rankCode": "A",
  "semanticClass": "suit-eichel"
}
```

Notes:

- `id` should remain deterministic (for tests and reconciliation).
- `ariaLabel` should use explicit spoken names (for example `Ober Herz`).
- Optional alias/help labels (for migration support) should remain secondary and never replace canonical text.

### 7.4 API Contract Guidance

Recommended for this feature scope:

- **Do not change backend wire card model**.
- Keep server payload lean and stable (`suit`, `rank`).
- Perform all text-label derivation in frontend adapter.

Optional future extension (not required now): server may expose a versioned metadata endpoint for notation dictionaries if localization or cross-client consistency becomes a requirement.

---

## 8. Implementation Approach (Design-Level, No Code Yet)

1. Define canonical notation policy for suits/ranks and aria naming.
2. Add adapter module that converts `{ suit, rank }` into presentation model.
3. Refactor card rendering path to consume presentation model only.
4. Update CSS states to ensure text is always visible and contrast-compliant.
5. Add focused tests:
   - Mapping correctness for all 32 cards.
   - State rendering keeps rank/suit text present.
   - Accessibility checks for focus visibility and non-color-only identity.
6. Update help/reference content for French-to-German mapping guidance.

---

## 9. Risks And Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Inconsistent naming across surfaces (hand vs trick vs logs) | High | Medium | Centralize mapping in one adapter + notation constants; add snapshot/contract tests for all surfaces. |
| User confusion during transition from French suits | Medium | High | Add concise in-product mapping reference and consistent canonical labels everywhere. |
| Color-only distinctions accidentally reintroduced in styling | High | Medium | Enforce text-first labels and accessibility checks; review CSS states for all interactive modes. |
| Mobile readability degradation due to dense labels | High | Medium | Define responsive typography and abbreviation policy with minimum readable size; test on narrow widths. |
| Regression in legal-move clarity during disabled/playable states | High | Medium | Keep legality cues additive (borders/opacity) and never remove rank/suit text. |
| Scope creep into rule logic changes | High | Low | Explicitly limit feature to presentation layer; preserve `{ suit, rank }` contract and rule modules unchanged. |

---

## 10. Scalability And Maintainability Considerations

- The adapter pattern scales to additional game surfaces without changing game logic.
- Canonical compact card model remains transport-efficient and backend-stable.
- Future localization can be layered by switching label dictionaries in adapter.
- Automated mapping tests over the fixed 32-card set provide high confidence with low maintenance.

---

## 11. Known Limitations And Future Improvements

### Limitations In This Scope

- This design does not introduce localization beyond canonical German/Altenburg labels.
- Decorative historical artwork fidelity is intentionally out of scope.

### Future Improvements

- Add optional educational alias toggles (for example, alternate terminology help).
- Add typography variants for accessibility profiles.
- Add telemetry around misplay attempts to validate transition clarity.

---

## 12. Decision

Adopt **Alternative B** and keep backend/frontend game-domain contracts unchanged at the logic boundary (`suit`, `rank`). Implement rendering changes only through a dedicated frontend presentation adapter and reusable text-card renderer.

This satisfies Issue #13 requirements with the best balance of delivery speed, quality, and long-term maintainability.
