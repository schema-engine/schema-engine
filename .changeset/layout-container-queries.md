---
'@schema-engine/layout': patch
---

A layout theme can measure its breakpoints against the grid's own wrapper instead of the window: `createLayoutTheme({ grid: { query: 'container' } })`. The breakpoint tokens, gap ramps and cascade are the same, so a document is unchanged by it; the stylesheet emits `@container se-grid (min-width: ...)` where it emitted `@media`, and one rule for the new `GRID_CONTAINER_CLASS` (`se-grid-container`), a block with inline-size containment that must wrap each grid, nested grids included. `query` defaults to `'media'`, and a theme without it keeps the stylesheet and the id it had. The two modes are different themes: their ids differ. `NormalizedGridTheme` gains `query`, and `GridQueryMode` is exported. In container mode each grid and item resets its private breakpoint gates in its base rule, so a nested grid below a breakpoint keeps its own layout when the grid around it is above it.
