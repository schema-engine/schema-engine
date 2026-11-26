---
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
---

Under a layout theme with `grid: { query: 'container' }`, both renderers wrap each grid (a step's, and the inner grid of each fieldset and array row) in an element with the `se-grid-container` class, so the breakpoints follow the width of the grid's wrapper and a nested grid follows its own. A theme that queries the window renders the markup it always did. `ChildGrid`, exported from `@schema-engine/forms-react/primitives` and `@schema-engine/forms-radiant/primitives`, lays out the children of a container element you write: it renders the grid and, under a container theme, its wrapper. `useChildGridProps` (forms-react) and `mergeChildrenGridHost` (forms-radiant) are removed from the public API: use `ChildGrid`, which renders the same grid and, under a container theme, the wrapper its breakpoints need (a breaking removal shipped as a patch, like the `useFormWizard` rename). The shadcn registry's fieldset and array rows use `ChildGrid`. The Radiant stylesheet drops a `form.rui-form:has(> .se-form-elements)` rule that no markup matched.
