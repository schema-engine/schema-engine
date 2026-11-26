---
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
---

Under a layout theme with `grid: { query: 'container' }`, both renderers wrap each grid (a step's, and the inner grid of each fieldset and array row) in an element with the `se-grid-container` class, so the breakpoints follow the width of the grid's wrapper and a nested grid follows its own. A theme that queries the window renders the markup it always did. `GridContainer`, exported from `@schema-engine/forms-react/primitives` and `@schema-engine/forms-radiant/primitives`, is that wrapper for an element you write: put it around a grid built with `useChildGridProps` or `mergeChildrenGridHost`. The shadcn registry's fieldset and array rows use it.
