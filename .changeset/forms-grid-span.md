---
'@schema-engine/forms': patch
---

Validation checks `grid.span`. A field that sets `span` and `width`, `offset`, `column` or `area` in one breakpoint is rejected at the conflicting key, a `span` under a grid whose `columns` are `'auto'` at any breakpoint is rejected at the `span` key (CSS cannot count the tracks of `auto`, so the span would be one track), and so is a `span` on a subgrid. A span inside a subgrid is checked against the grid the subgrid sits on. `autoFlow` is accepted on a form's or a step's grid and rejected inside `responsive`.
