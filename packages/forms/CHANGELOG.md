# @schema-engine/forms

## 0.5.3

### Patch Changes

- [#424](https://github.com/schema-engine/schema-engine/pull/424) [`5220973`](https://github.com/schema-engine/schema-engine/commit/5220973b4ef4a1c766deae90754448d0354f7c3c) Thanks [@andeeplus](https://github.com/andeeplus)! - Each step in the runtime snapshot, and so in `FormWizard`, carries its `title` from the step config, so a stepper reads `step.title` instead of looking it up by id in its own copy of the config. A step of a validated form config always has one; `title` is optional in the type only because `FormRuntimeStep`, which a hand-built runtime config uses, does not require it.

- [#422](https://github.com/schema-engine/schema-engine/pull/422) [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538) Thanks [@andeeplus](https://github.com/andeeplus)! - Adds the `FormWizard` type: the current step, every step's state, `navigating` and the commands `next`, `back` and `goTo`, which each renderer hands to its app (`useFormWizard()` in React, `FormController.wizard` in Radiant).

- [#415](https://github.com/schema-engine/schema-engine/pull/415) [`8c6eb8b`](https://github.com/schema-engine/schema-engine/commit/8c6eb8b24e431faed08eaa31d815e364557a310b) Thanks [@andeeplus](https://github.com/andeeplus)! - `formatIssuePath` now lives in `@schema-engine/registry`; import it from there. `@schema-engine/forms` still re-exports it, so existing imports keep working. Its output for the paths it already took is unchanged, and it now also takes a missing path and the `{ key }` segments of a Standard Schema issue.

    An action of a form or of a step whose `$type` no registration answers is now reported as `No registration for $type '<type>'. Register it with createFormEngine({ actions: [...] }).` (it was `Unknown action type '<type>'. Register it in the action registry.`), at the same path, because `parseActions` now checks each entry with `safeParseNode`.

- [#426](https://github.com/schema-engine/schema-engine/pull/426) [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375) Thanks [@andeeplus](https://github.com/andeeplus)! - Validation checks `grid.subgrid`. A subgrid must be a container that holds elements and sets no `width`, `offset`, `column`, `area`, `justifySelf` or `placeSelf`; it is rejected under a grid that draws `areas`, on an array (subgrid rows are not supported yet), and inside `responsive`. A `width` or `offset` inside a subgrid now counts against the grid it sits in, so it conflicts with that grid's `columns`, `minColumnWidth` or `areas`, at the inner element's own key. The new `gridTrackItems(elements)` returns the elements that count a grid's tracks, the children of every subgrid included; the renderers pass it to `getGridVariables`.

- [#419](https://github.com/schema-engine/schema-engine/pull/419) [`ea85297`](https://github.com/schema-engine/schema-engine/commit/ea85297cf18cb1c4d267d57d0637c29a0eedde30) Thanks [@andeeplus](https://github.com/andeeplus)! - The checks of an element, a view recipe and a validation rule use `safeParseNode` from `@schema-engine/registry`, like the actions of a form, so each says the same thing about a `$type` it cannot use, and keeps its hint on where to register it:

    - An element `$type` nothing registers is `No registration for $type 'phone'. Register it with createFormEngine({ elements: [...] }).` (it was `Unknown element type 'phone'. Register it with createFormEngine({ elements: [...] }).`), at the same path.
    - A `view.$type` nothing registers is `No registration for $type 'nope'. Register it with createFormEngine({ recipes: [...] }).` (it was `Unknown view recipe 'nope'. Register it with createFormEngine({ recipes: [...] }).`), at the same path. An empty `view.$type` is now reported as an unregistered type; it was `Must be a non-empty string.`.
    - A rule `$type` nothing registers is `No registration for $type 'postalcode'. Register it with createFormEngine({ validations: [...] }). Registered rules: required, ...` (it was `Unknown validation rule 'postalcode'. Register it with createFormEngine({ validations: [...] }). Registered rules: required, ...`), at the same path, and the error `createSchema` throws for it says the same.
    - `validateElement` and `validateElementConfig` given a value that is not an object report `Expected an object with a string $type.` at `[]` (it was `Invalid element configuration: missing $type.` at `['$type']`), and an object without a string `$type` reports `Expected a string $type.` at `['$type']` (it was `Invalid element configuration: missing $type.`, at the same path). The same applies to a child of an element when its container's schema does not check the children: a container that uses `elementChildrenSchema` still reports a child that is not an object or has no `$type` itself, so those issues are unchanged, and a custom container that does not use it now reports the child with these messages at the child's path.

    The other issues, their paths and the normalized result are unchanged.

- Updated dependencies [[`61750ae`](https://github.com/schema-engine/schema-engine/commit/61750ae1c1739331d93590d4b745cff7847fdbcc), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`02f21c9`](https://github.com/schema-engine/schema-engine/commit/02f21c9ddc51e0b1d7712854707580f5b4e895d0), [`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0)]:
    - @schema-engine/layout@0.5.2
    - @schema-engine/actions@0.5.2
    - @schema-engine/registry@0.5.2

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
