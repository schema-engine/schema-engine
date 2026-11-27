---
'@schema-engine/layout': patch
---

An element can lay its children on its parent grid's column tracks and gap with `grid: { subgrid: true }` (`ElementGridConfig.subgrid`, top level only, never in `responsive`). It spans its parent's full row, so it takes no `width`, `offset`, `column`, `area`, `justifySelf` or `placeSelf`. The stylesheet gains three rules for the new `GRID_SUBGRID_CLASS` (`se-subgrid`) in both query modes, which add about 360 bytes to every theme, since a theme cannot know which documents will use them: a box becomes a column subgrid on the parent's gap, a child that is not an item spans the row, and an inner `se-grid` takes the parent's template, gap and default column. `getGridItemVariables` emits the full-row placement. New exports `GRID_SUBGRID_CLASS`, `elementIsSubgrid` and `subgridPlacementIssue`; a domain passes the children of its subgrids among the items it gives `getGridVariables`.
