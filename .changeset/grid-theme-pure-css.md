---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
---

Grid layout becomes theme-driven pure CSS. The engine owns the grid vocabulary
through a new `grid` option on `createFormEngine`/`createFormEngine` variants:
breakpoint thresholds (`sm`…`2xl`), gap token definitions
(`none | compact | default | loose | wide`), and the default minimum column
width. Forms describe layout with `columns`, `gap`/`gapX`/`gapY`, responsive
entries per breakpoint, and per-field `grid` placement. `grid.gap` no longer
accepts numbers — semantic tokens or raw CSS values only. Renderers generate
the theme-scoped stylesheet (`engine.getGridThemeCss()`, scoped to
`data-se-grid-theme`) and emit it inline during render with the form's CSS
variables, so responsive layout is CSS-driven (media queries), SSR output is
styled without FOUC, and hydration is not required for layout.

Field responsive placement now cascades across breakpoints like form columns.
Grid themes are frozen at engine construction as one compiled
`engine.getCompiledGrid()` value (theme plus stylesheet).
`engine.extend()` no longer accepts a `grid` option (the compiled grid is
inherited). Breakpoint thresholds must preserve named cascade order.
