---
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
---

A fieldset with `grid: { subgrid: true }` lays its fields on the column tracks and gap of the grid it sits in, so they line up with the fields around it. `ChildGrid` takes a `subgrid` prop for a container you write: it renders the grid with the `se-subgrid` class, no inline track variables and, in container mode, no `se-grid-container` wrapper. A `ChildGrid` without it, and a step's grid, count the widths of the children of a subgrid element among their own. The shadcn registry fieldset puts `se-subgrid` on its item, its `fieldset` (which the stylesheet makes `display: contents`) and its grid. The Radiant subgrid fieldset is a `div` that keeps the fieldset's border and padding, around a `fieldset` that draws none, because a `<fieldset>` cannot be a subgrid; its legend is no longer drawn on the border, and the first and last columns are inset by that border and padding. A subgrid fieldset behind a constraint puts the class on the constraint host too. Forms without `subgrid` render the markup they did.
