# @schema-engine/forms-radiant

## 0.5.3

### Patch Changes

- [#422](https://github.com/schema-engine/schema-engine/pull/422) [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538) Thanks [@andeeplus](https://github.com/andeeplus)! - `FormController` gains `wizard` and `submission`, signals over the form's wizard (`FormWizard`) and submission that read `undefined` while the form has no runtime and follow the runtime the instance replaces, and `clearSubmission()`. An element no longer needs `formInstanceContext` and `contextSelector` to build a stepper or read the submission. `formInstanceContext` and `FormInstanceContextValue` stay exported from `@schema-engine/forms-radiant/contexts` for the custom blocks and recipes of a renderer; `FormInstanceContextValue` now extends `FormWizard`, with the same fields as before.

- [#425](https://github.com/schema-engine/schema-engine/pull/425) [`2b3ae61`](https://github.com/schema-engine/schema-engine/commit/2b3ae61d13c8a8dfaead4d3fef1d74e2566c2011) Thanks [@andeeplus](https://github.com/andeeplus)! - Under a layout theme with `grid: { query: 'container' }`, both renderers wrap each grid (a step's, and the inner grid of each fieldset and array row) in an element with the `se-grid-container` class, so the breakpoints follow the width of the grid's wrapper and a nested grid follows its own. A theme that queries the window renders the markup it always did. `ChildGrid`, exported from `@schema-engine/forms-react/primitives` and `@schema-engine/forms-radiant/primitives`, lays out the children of a container element you write: it renders the grid and, under a container theme, its wrapper. `useChildGridProps` (forms-react) and `mergeChildrenGridHost` (forms-radiant) are removed from the public API: use `ChildGrid`, which renders the same grid and, under a container theme, the wrapper its breakpoints need (a breaking removal shipped as a patch, like the `useFormWizard` rename). The shadcn registry's fieldset and array rows use `ChildGrid`. The Radiant stylesheet drops a `form.rui-form:has(> .se-form-elements)` rule that no markup matched.
- Updated dependencies [[`5220973`](https://github.com/schema-engine/schema-engine/commit/5220973b4ef4a1c766deae90754448d0354f7c3c), [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538), [`8c6eb8b`](https://github.com/schema-engine/schema-engine/commit/8c6eb8b24e431faed08eaa31d815e364557a310b), [`61750ae`](https://github.com/schema-engine/schema-engine/commit/61750ae1c1739331d93590d4b745cff7847fdbcc), [`ea85297`](https://github.com/schema-engine/schema-engine/commit/ea85297cf18cb1c4d267d57d0637c29a0eedde30), [`02f21c9`](https://github.com/schema-engine/schema-engine/commit/02f21c9ddc51e0b1d7712854707580f5b4e895d0)]:
    - @schema-engine/forms@0.5.3
    - @schema-engine/layout@0.5.2
    - @schema-engine/actions@0.5.2

## 0.5.2

### Patch Changes

- [#408](https://github.com/schema-engine/schema-engine/pull/408) [`1adccc7`](https://github.com/schema-engine/schema-engine/commit/1adccc70f2fe81361510df0723e9149559673ae7) Thanks [@andeeplus](https://github.com/andeeplus)! - Cards, the hero form, fieldsets, array rows, the drop zone and the debugger timeline now round their corners with Radiant UI's `--radius-container` instead of `--radius-control`, so a theme can round controls fully (pill) without turning cards into ellipses. With the default Radiant UI radius pack, containers are slightly rounder (5.6px instead of 4.2px).
- Updated dependencies []:
    - @schema-engine/forms@0.5.2

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.

- [#405](https://github.com/schema-engine/schema-engine/pull/405) [`17652b3`](https://github.com/schema-engine/schema-engine/commit/17652b3db0ee517515da7addb4431f80689a6f31) Thanks [@andeeplus](https://github.com/andeeplus)! - Require `@ecopages/radiant-ui` 0.6.2 or later, which shows the error border on a select or combobox in an invalid field.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39), [`31caacb`](https://github.com/schema-engine/schema-engine/commit/31caacb15911743031a4fd79ba5453a2003d9927), [`174a427`](https://github.com/schema-engine/schema-engine/commit/174a42755c3295a34d3e7a2c35c2be6616158433)]:
    - @schema-engine/actions@0.5.1
    - @schema-engine/layout@0.5.1
    - @schema-engine/forms@0.5.1
