# @schema-engine/layout

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.

- [#402](https://github.com/schema-engine/schema-engine/pull/402) [`31caacb`](https://github.com/schema-engine/schema-engine/commit/31caacb15911743031a4fd79ba5453a2003d9927) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep an item's `--se-item-display-mode` to that item: each grid now resets it, so the fields inside a fieldset that lays itself out as a grid stay `block` instead of turning into grids.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39)]:
    - @schema-engine/registry@0.5.1
