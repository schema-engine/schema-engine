---
'@schema-engine/forms-radiant': minor
---

Bind a submit-only `se-form-actions` block to the single-step recipes and stop `se-form-step` from flashing the active step hidden during hydration.

- `card`, `split-screen`, and `hero-background` now author an actions slot through the new `FormActionsBlock` (`se-form-actions`), so single-step forms render a submit button in recipe chrome (aligned per the `actions.align` slot config).
- `se-form-step` no longer treats a missing `formInstanceContext` value as "no active step": until a context value arrives it falls back to the props default (step 0 active), so hydrating a wizard never blanks the first step's fields while the context is still settling.
