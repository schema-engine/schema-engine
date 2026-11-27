# @schema-engine/layout

## 0.5.2

### Patch Changes

- [#425](https://github.com/schema-engine/schema-engine/pull/425) [`61750ae`](https://github.com/schema-engine/schema-engine/commit/61750ae1c1739331d93590d4b745cff7847fdbcc) Thanks [@andeeplus](https://github.com/andeeplus)! - A layout theme can measure its breakpoints against the grid's own wrapper instead of the window: `createLayoutTheme({ grid: { query: 'container' } })`. The breakpoint tokens, gap ramps and cascade are the same, so a document is unchanged by it; the stylesheet emits `@container se-grid (min-width: ...)` where it emitted `@media`, and one rule for the new `GRID_CONTAINER_CLASS` (`se-grid-container`), a block with inline-size containment that must wrap each grid, nested grids included. `query` defaults to `'media'`, and a theme without it keeps the stylesheet and the id it had. The two modes are different themes: their ids differ. `NormalizedGridTheme` gains `query`, and `GridQueryMode` is exported. In container mode each grid and item resets its private breakpoint gates in its base rule, so a nested grid below a breakpoint keeps its own layout when the grid around it is above it.

- [#426](https://github.com/schema-engine/schema-engine/pull/426) [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375) Thanks [@andeeplus](https://github.com/andeeplus)! - An element can lay its children on its parent grid's column tracks and gap with `grid: { subgrid: true }` (`ElementGridConfig.subgrid`, top level only, never in `responsive`). It spans its parent's full row, so it takes no `width`, `offset`, `column`, `area`, `justifySelf` or `placeSelf`. The stylesheet gains three rules for the new `GRID_SUBGRID_CLASS` (`se-subgrid`) in both query modes, which add about 360 bytes to every theme, since a theme cannot know which documents will use them: a box becomes a column subgrid on the parent's gap, a child that is not an item spans the row, and an inner `se-grid` takes the parent's template, gap and default column. `getGridItemVariables` emits the full-row placement. New exports `GRID_SUBGRID_CLASS`, `elementIsSubgrid` and `subgridPlacementIssue`; a domain passes the children of its subgrids among the items it gives `getGridVariables`.
- Updated dependencies [[`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0)]:
    - @schema-engine/registry@0.5.2

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.

- [#402](https://github.com/schema-engine/schema-engine/pull/402) [`31caacb`](https://github.com/schema-engine/schema-engine/commit/31caacb15911743031a4fd79ba5453a2003d9927) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep an item's `--se-item-display-mode` to that item: each grid now resets it, so the fields inside a fieldset that lays itself out as a grid stay `block` instead of turning into grids.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39)]:
    - @schema-engine/registry@0.5.1
