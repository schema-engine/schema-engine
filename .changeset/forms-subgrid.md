---
'@schema-engine/forms': patch
---

Validation checks `grid.subgrid`. A subgrid must be a container that holds elements and sets no `width`, `offset`, `column`, `area`, `justifySelf` or `placeSelf`; it is rejected under a grid that draws `areas`, on an array (subgrid rows are not supported yet), and inside `responsive`. A `width` or `offset` inside a subgrid now counts against the grid it sits in, so it conflicts with that grid's `columns`, `minColumnWidth` or `areas`, at the inner element's own key. The new `gridTrackItems(elements)` returns the elements that count a grid's tracks, the children of every subgrid included; the renderers pass it to `getGridVariables`.
