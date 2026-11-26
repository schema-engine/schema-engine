---
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
---

A fieldset with `grid: { subgrid: true }` lays its fields on the column tracks and gap of the grid it sits in, so they line up with the fields around it. `ChildGrid` takes either `elements` or `subgrid` (passing both is a type error) for a container you write: with `subgrid` it renders the grid with the `se-subgrid` class, no inline track variables and, in container mode, no `se-grid-container` wrapper. A `ChildGrid` without it, and a step's grid, count the widths of the children of a subgrid element among their own. In both renderers a subgrid fieldset is a `div` with `role="group"` labelled by its legend, instead of a `<fieldset>`, because Chromium cannot make a fieldset a subgrid; the shadcn registry adds a `FieldLegend` primitive for it. The Radiant one keeps the fieldset's border and padding, so its legend is a heading row rather than a gap in the border, and the first and last columns are inset by that border and padding. A subgrid fieldset behind a constraint puts the class on the constraint host too. Forms without `subgrid` render the markup they did.
