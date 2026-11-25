# @schema-engine/forms

## 0.5.2

No changes in this release.

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.

- [#403](https://github.com/schema-engine/schema-engine/pull/403) [`174a427`](https://github.com/schema-engine/schema-engine/commit/174a42755c3295a34d3e7a2c35c2be6616158433) Thanks [@andeeplus](https://github.com/andeeplus)! - The form state container conformance suite no longer depends on Vitest, so `vitest` is no longer a peer dependency. Pass your runner's `describe` and `test`: `formStateContainerConformance(createStore, { describe, test })` works with Vitest, Jest, Bun and `node:test`.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39), [`31caacb`](https://github.com/schema-engine/schema-engine/commit/31caacb15911743031a4fd79ba5453a2003d9927)]:
    - @schema-engine/registry@0.5.1
    - @schema-engine/actions@0.5.1
    - @schema-engine/layout@0.5.1
