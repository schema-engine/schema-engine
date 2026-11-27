# @schema-engine/forms-react

## 0.5.3

### Patch Changes

- [#422](https://github.com/schema-engine/schema-engine/pull/422) [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538) Thanks [@andeeplus](https://github.com/andeeplus)! - Breaking rename shipped as a patch, because `useFormInstanceActions` was released in 0.5.0: `useFormInstanceActions` is now `useFormWizard`, with no alias, and it returns `FormWizard` from `@schema-engine/forms`. The `FormInstanceContextValue` type of `@schema-engine/forms-react/hooks` is removed; use `FormWizard`.

- [#425](https://github.com/schema-engine/schema-engine/pull/425) [`2b3ae61`](https://github.com/schema-engine/schema-engine/commit/2b3ae61d13c8a8dfaead4d3fef1d74e2566c2011) Thanks [@andeeplus](https://github.com/andeeplus)! - Under a layout theme with `grid: { query: 'container' }`, both renderers wrap each grid (a step's, and the inner grid of each fieldset and array row) in an element with the `se-grid-container` class, so the breakpoints follow the width of the grid's wrapper and a nested grid follows its own. A theme that queries the window renders the markup it always did. `ChildGrid`, exported from `@schema-engine/forms-react/primitives` and `@schema-engine/forms-radiant/primitives`, lays out the children of a container element you write: it renders the grid and, under a container theme, its wrapper. `useChildGridProps` (forms-react) and `mergeChildrenGridHost` (forms-radiant) are removed from the public API: use `ChildGrid`, which renders the same grid and, under a container theme, the wrapper its breakpoints need (a breaking removal shipped as a patch, like the `useFormWizard` rename). The shadcn registry's fieldset and array rows use `ChildGrid`. The Radiant stylesheet drops a `form.rui-form:has(> .se-form-elements)` rule that no markup matched.

- [#426](https://github.com/schema-engine/schema-engine/pull/426) [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375) Thanks [@andeeplus](https://github.com/andeeplus)! - A fieldset with `grid: { subgrid: true }` lays its fields on the column tracks and gap of the grid it sits in, so they line up with the fields around it. `ChildGrid` takes either `elements` or `subgrid` (passing both is a type error) for a container you write: with `subgrid` it renders the grid with the `se-subgrid` class, no inline track variables and, in container mode, no `se-grid-container` wrapper. A `ChildGrid` without it, and a step's grid, count the widths of the children of a subgrid element among their own. In both renderers a subgrid fieldset is a `div` with `role="group"` labelled by its legend, instead of a `<fieldset>`, because Chromium cannot make a fieldset a subgrid; the shadcn registry adds a `FieldLegend` primitive for it. The Radiant one keeps the fieldset's border and padding, so its legend is a heading row rather than a gap in the border, and the first and last columns are inset by that border and padding. A subgrid fieldset behind a constraint puts the class on the constraint host too. Forms without `subgrid` render the markup they did.
- Updated dependencies [[`5220973`](https://github.com/schema-engine/schema-engine/commit/5220973b4ef4a1c766deae90754448d0354f7c3c), [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538), [`8c6eb8b`](https://github.com/schema-engine/schema-engine/commit/8c6eb8b24e431faed08eaa31d815e364557a310b), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`61750ae`](https://github.com/schema-engine/schema-engine/commit/61750ae1c1739331d93590d4b745cff7847fdbcc), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`ea85297`](https://github.com/schema-engine/schema-engine/commit/ea85297cf18cb1c4d267d57d0637c29a0eedde30)]:
    - @schema-engine/forms@0.5.3
    - @schema-engine/layout@0.5.2

## 0.5.2

### Patch Changes

- Updated dependencies []:
    - @schema-engine/forms@0.5.2

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39), [`31caacb`](https://github.com/schema-engine/schema-engine/commit/31caacb15911743031a4fd79ba5453a2003d9927), [`174a427`](https://github.com/schema-engine/schema-engine/commit/174a42755c3295a34d3e7a2c35c2be6616158433)]:
    - @schema-engine/layout@0.5.1
    - @schema-engine/forms@0.5.1
