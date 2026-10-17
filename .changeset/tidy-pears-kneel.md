---
'@schema-engine/forms': minor
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
'@schema-engine/registry': patch
---

Remove compatibility aliases and unsupported configuration. Breaking removals and their replacements:

- `BuilderActionTrigger` is removed; use `FormActionTrigger`.
- `BuilderActionExecutionContext` is removed; use `BuilderActionRuntimeContext`, which it aliased.
- `RecipeGetter` and the `(id) => recipe` lookup form of `resolveFormRecipe` are removed; pass the `FormEngine` or a `{ getRecipe }` object (`RecipeLookup`).
- Recipe metadata no longer accepts `deprecated`.
- Grid `rows`, `autoFit`, `autoFill` and `maxColumnWidth` are now rejected, as are other unknown grid keys; use `columns: 'auto'` with `minColumnWidth`.
- `validateFormConfig` and `validateElementConfig` now require `hasValidation` in their options, so unknown validation rule types are always rejected.

Breakpoint schemas now derive from the shared placement declarations. `@schema-engine/forms/actions` also exports `ActionDispatcher`. Published dependency and side-effect declarations are corrected, and supported Radiant peer ranges are bounded.
