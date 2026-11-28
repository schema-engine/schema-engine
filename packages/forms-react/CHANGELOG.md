# @schema-engine/forms-react

## 0.6.0

### Minor Changes

- [#448](https://github.com/schema-engine/schema-engine/pull/448) [`d19f372`](https://github.com/schema-engine/schema-engine/commit/d19f372888cbde7ea812583a2d51c9d78762ec85) Thanks [@andeeplus](https://github.com/andeeplus)! - Each export has one import path: `@schema-engine/forms-react/hooks` no longer re-exports what `@schema-engine/forms` declares, the names `@schema-engine/forms-react/contexts` re-exported come from `@schema-engine/forms/recipes` (the entry itself is removed), and `SubmissionState` and `ViewContextValue`, which renamed two of those, are gone.

    | Before (from `@schema-engine/forms-react/hooks`)                                                                                   | After                                                      |
    | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
    | `FORM_ROOT`                                                                                                                        | `FORM_ROOT` from `@schema-engine/forms/state-container`    |
    | `FieldArrayValue`, `FormIssueFormatter`, `FormStateError`, `FormStateErrorsInput`, `FormStateIssue`, `FormSubmissionIssue` (types) | the same names from `@schema-engine/forms/state-container` |
    | `FormValues`, `FormSubmitHelpers`, `SubmissionStatus` (types)                                                                      | the same names from `@schema-engine/forms`                 |
    | `SubmissionState` (type)                                                                                                           | `FormSubmissionState` from `@schema-engine/forms`          |

    | Before (from `@schema-engine/forms-react/contexts`) | After                                              |
    | --------------------------------------------------- | -------------------------------------------------- |
    | `ViewContextValue` (type)                           | `ViewModel` from `@schema-engine/forms/recipes`    |
    | `ViewNavigation`, `ViewStep` (types)                | the same names from `@schema-engine/forms/recipes` |

    The hooks stay on `@schema-engine/forms-react/hooks`, and `ViewProvider` is on `@schema-engine/forms-react/primitives`. A copied shadcn `form-submission-alert.tsx` imports `FORM_ROOT` from `@schema-engine/forms/state-container`: run `shadcn add` for the item again, or change the import by hand.

    ```ts
    // before
    import { FORM_ROOT, type FieldArrayValue, type SubmissionState } from '@schema-engine/forms-react/hooks';
    // after
    import { FORM_ROOT, type FieldArrayValue } from '@schema-engine/forms/state-container';
    import type { FormSubmissionState } from '@schema-engine/forms';
    ```

- [#456](https://github.com/schema-engine/schema-engine/pull/456) [`2aae56a`](https://github.com/schema-engine/schema-engine/commit/2aae56a0b700e6ce6b24b0e7b289f7ec42385dfb) Thanks [@andeeplus](https://github.com/andeeplus)! - The entries follow the renderer layout shared with forms-radiant: `.`, `/primitives`, `/debugger` and `/debugger.css` mean the same in both, and forms-react adds `/hooks`.

    - `FormDebugger` moves from `@schema-engine/forms-react/components/form-debugger` to `@schema-engine/forms-react/debugger`, and its styles from `@schema-engine/forms-react/global.css` to `@schema-engine/forms-react/debugger.css`. `global.css` held only the debugger's styles, so nothing else needs loading. The `style` field of the package is removed with it.
    - `ViewProvider` moves from `@schema-engine/forms-react/contexts`, which is removed, to `@schema-engine/forms-react/primitives`.
    - `FormEngineContext`, `FormEngineContextValue` and `createFormEngineContextValue` are no longer exported: read the engine with `useFormEngine` or `useOptionalFormEngine` from `@schema-engine/forms-react/hooks`.

    ```diff
    - import { FormDebugger } from '@schema-engine/forms-react/components/form-debugger';
    - import '@schema-engine/forms-react/global.css';
    + import { FormDebugger } from '@schema-engine/forms-react/debugger';
    + import '@schema-engine/forms-react/debugger.css';
    - import { ViewProvider } from '@schema-engine/forms-react/contexts';
    + import { ViewProvider } from '@schema-engine/forms-react/primitives';
    ```

- [#447](https://github.com/schema-engine/schema-engine/pull/447) [`5714552`](https://github.com/schema-engine/schema-engine/commit/5714552399a90f1f31ec74df5cbb30c2e83a0892) Thanks [@andeeplus](https://github.com/andeeplus)! - **Zod `^4.5.0` is required.** The peer range of `zod` was `^4.0.17`, which promised more than the packages work with: Zod before 4.2.0 has no Standard JSON Schema target names and no `~standard.jsonSchema`, and the JSON Schema export of the forms engine needs Zod 4.5.0, where the catalog ids of a schema are written as `$defs` entries (the document tests fail on 4.4.3). Update `zod` to 4.5.0 or later. A CI job runs the type checks and tests of every package that uses Zod against Zod 4.5.0 itself.

    ```json
    // before
    { "peerDependencies": { "zod": "^4.0.17" } }
    // after
    { "peerDependencies": { "zod": "^4.5.0" } }
    ```

### Patch Changes

- [#455](https://github.com/schema-engine/schema-engine/pull/455) [`b3302bf`](https://github.com/schema-engine/schema-engine/commit/b3302bff07ae32a812aae17b1ffa4a67a81ed077) Thanks [@andeeplus](https://github.com/andeeplus)! - The published packages resolve under `node16` and `nodenext` module resolution, and declare what they are.

    - The declaration files write their relative imports with an extension (`./types.js`), so a consumer on `node16` or `nodenext` finds the exports of `@schema-engine/actions`, `forms`, `forms-react`, `layout` and `forms-radiant`, where the entry resolved to no exports. `@schema-engine/forms-radiant` no longer writes `export * from './recipes/index.d.ts'`, which was an error (TS2846) for a project with `skipLibCheck: false`.
    - `@schema-engine/actions` has an `exports` map (`.` and `./package.json`), as the other packages do, and `@schema-engine/registry` exports `./package.json`.
    - No package declares an `engines` field.
    - `@schema-engine/forms-radiant` no longer lists `@schema-engine/actions` as a dependency, which nothing imported.

- Updated dependencies [[`1f80c6b`](https://github.com/schema-engine/schema-engine/commit/1f80c6b001fcdbf0b6b038e799bea6aceba62844), [`7d5319a`](https://github.com/schema-engine/schema-engine/commit/7d5319a367314501965b5813ec37b12ecb9cad11), [`2ddce15`](https://github.com/schema-engine/schema-engine/commit/2ddce1566bd4a1812557ddbf65c1af693da5e28f), [`1931b45`](https://github.com/schema-engine/schema-engine/commit/1931b45fe173eaf7dbad57b92d04fb0577c87827), [`b75f9bb`](https://github.com/schema-engine/schema-engine/commit/b75f9bb5b6e158a846773c394660450e00fa26ca), [`d19f372`](https://github.com/schema-engine/schema-engine/commit/d19f372888cbde7ea812583a2d51c9d78762ec85), [`fcc99fc`](https://github.com/schema-engine/schema-engine/commit/fcc99fc74dd68437cde326a58d0bbd3656ffa82f), [`bacef31`](https://github.com/schema-engine/schema-engine/commit/bacef3173f05807b5fed658655d401558450d04c), [`b3302bf`](https://github.com/schema-engine/schema-engine/commit/b3302bff07ae32a812aae17b1ffa4a67a81ed077), [`822d1fd`](https://github.com/schema-engine/schema-engine/commit/822d1fd7d29fa9770abe5fc2eb2b9700899041a7), [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609), [`35c1c5a`](https://github.com/schema-engine/schema-engine/commit/35c1c5ace849ddbf79d4cdab7d32dfb132bc3059), [`5714552`](https://github.com/schema-engine/schema-engine/commit/5714552399a90f1f31ec74df5cbb30c2e83a0892)]:
    - @schema-engine/forms@0.6.0
    - @schema-engine/layout@0.6.0

## 0.5.3

### Patch Changes

- [#422](https://github.com/schema-engine/schema-engine/pull/422) [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538) Thanks [@andeeplus](https://github.com/andeeplus)! - Breaking rename shipped as a patch, because `useFormInstanceActions` was released in 0.5.0: `useFormInstanceActions` is now `useFormWizard`, with no alias, and it returns `FormWizard` from `@schema-engine/forms`. The `FormInstanceContextValue` type of `@schema-engine/forms-react/hooks` is removed; use `FormWizard`.

- [#429](https://github.com/schema-engine/schema-engine/pull/429) [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75) Thanks [@andeeplus](https://github.com/andeeplus)! - The slot schemas of a recipe spec can be any Standard Schema that validates synchronously: Zod Mini, Valibot or one you write with `standardSchema`. `defineProtocolRecipeSpec` and `defineRecipeSpec` build the view schema themselves, so a spec no longer needs `zod/mini`. A recipe registration carries the slot schemas as `slotSchemas`, and `createRecipeRegistry` (so `createFormEngine`) throws when they do not list exactly the recipe's `slots`, or one is not a Standard Schema. `bindRecipe`, `readSlotConfig`, `getSlotConfig`, `defineFormRecipe`, `defineRecipe` (React and Radiant), `useViewConfig` and `RadiantRecipePayload` take any Standard Schema instead of a Zod one. Specs with Zod Mini slot schemas need no change: the same call gives the same types for `view`, `slotDefaults` and `getSlotConfig`, and the same JSON Schema. In the JSON Schema export, a Zod slot is exported in full, a slot that provides Standard JSON Schema (`~standard.jsonSchema`) is exported as what it returns, and any other slot (Valibot, or a hand-written one without `jsonSchema`) is listed as an open object (`additionalProperties: {}`) with the `appearance` values the recipe declares for it. `@schema-engine/forms-react` and `@schema-engine/forms-radiant` now depend on `@standard-schema/spec` for these types.

    Breaking, and shipped as a patch while the packages have no users outside this repository:

    - `spec.schema` and `recipe.schema` are no longer Zod schemas, so `.parse`, `.safeParse`, `.shape` and passing them to `z.toJSONSchema`, `z.extend` or `z.safeExtend` fail. Validate with `safeParseStandardSchema(spec.schema, view)` from `@schema-engine/registry` (or `safeParseNode`), get a JSON Schema from the forms engine (`describeRecipe`, `generateJSONSchemaCollection`), and compose from `spec.slotSchemas`.
    - `RecipeViewSchema<TType, TSlots>` is now a `StandardSchemaV1<Input, Output>`, not a `ZodMiniObject`. Read its types with `StandardSchemaV1.InferInput` and `InferOutput`.
    - `appearanceAxes` on a slot whose schema input has no `appearance` key is a compile error, for every slot schema and not only strict Zod objects. A non-strict `z.object` slot without an `appearance` key used to pass, because it dropped the key instead of rejecting it; it now fails to compile. The runtime check that probed the schema for the key is gone, since Standard Schema reports no issue codes to probe with, and `resolveRecipeView` removes `appearance` before the slot schema parses. A spec cast past the types now fails only at compile time. Migration: add `appearance: z.optional(AppearanceConfigSchema)` (or the library's equivalent) to the slot schema, or use a loose object; a hand-written slot states its input type with `standardSchema<TOutput, TInput>`.
    - Messages changed. A key the recipe does not declare is an issue at that key (`Recipe 'x' does not accept view key 'y'. Allowed: ...`) and not an `unrecognized_keys` issue at the view. A bad `slotDefaults` entry reads `slotDefaults.<slot> is invalid: <path>: <message>`, with the message of the slot library and the offending key in the path (an unknown key a library reports on the object, as Zod does, is named at the key).

- [#425](https://github.com/schema-engine/schema-engine/pull/425) [`2b3ae61`](https://github.com/schema-engine/schema-engine/commit/2b3ae61d13c8a8dfaead4d3fef1d74e2566c2011) Thanks [@andeeplus](https://github.com/andeeplus)! - Under a layout theme with `grid: { query: 'container' }`, both renderers wrap each grid (a step's, and the inner grid of each fieldset and array row) in an element with the `se-grid-container` class, so the breakpoints follow the width of the grid's wrapper and a nested grid follows its own. A theme that queries the window renders the markup it always did. `ChildGrid`, exported from `@schema-engine/forms-react/primitives` and `@schema-engine/forms-radiant/primitives`, lays out the children of a container element you write: it renders the grid and, under a container theme, its wrapper. `useChildGridProps` (forms-react) and `mergeChildrenGridHost` (forms-radiant) are removed from the public API: use `ChildGrid`, which renders the same grid and, under a container theme, the wrapper its breakpoints need (a breaking removal shipped as a patch, like the `useFormWizard` rename). The shadcn registry's fieldset and array rows use `ChildGrid`. The Radiant stylesheet drops a `form.rui-form:has(> .se-form-elements)` rule that no markup matched.

- [#426](https://github.com/schema-engine/schema-engine/pull/426) [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375) Thanks [@andeeplus](https://github.com/andeeplus)! - A fieldset with `grid: { subgrid: true }` lays its fields on the column tracks and gap of the grid it sits in, so they line up with the fields around it. `ChildGrid` takes either `elements` or `subgrid` (passing both is a type error) for a container you write: with `subgrid` it renders the grid with the `se-subgrid` class, no inline track variables and, in container mode, no `se-grid-container` wrapper. A `ChildGrid` without it, and a step's grid, count the widths of the children of a subgrid element among their own. In both renderers a subgrid fieldset is a `div` with `role="group"` labelled by its legend, instead of a `<fieldset>`, because Chromium cannot make a fieldset a subgrid; the shadcn registry adds a `FieldLegend` primitive for it. The Radiant one keeps the fieldset's border and padding, so its legend is a heading row rather than a gap in the border, and the first and last columns are inset by that border and padding. A subgrid fieldset behind a constraint puts the class on the constraint host too. Forms without `subgrid` render the markup they did.
- Updated dependencies [[`5220973`](https://github.com/schema-engine/schema-engine/commit/5220973b4ef4a1c766deae90754448d0354f7c3c), [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538), [`8c6eb8b`](https://github.com/schema-engine/schema-engine/commit/8c6eb8b24e431faed08eaa31d815e364557a310b), [`73787a2`](https://github.com/schema-engine/schema-engine/commit/73787a276e113037ad03122a90ef880ef936d0e4), [`81147d5`](https://github.com/schema-engine/schema-engine/commit/81147d5b685f74ea6aecff1ec9cc803808ec284f), [`5311534`](https://github.com/schema-engine/schema-engine/commit/5311534a1d22902fa95174e455bbcafa0f38eda2), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`61750ae`](https://github.com/schema-engine/schema-engine/commit/61750ae1c1739331d93590d4b745cff7847fdbcc), [`81147d5`](https://github.com/schema-engine/schema-engine/commit/81147d5b685f74ea6aecff1ec9cc803808ec284f), [`a2a2fc7`](https://github.com/schema-engine/schema-engine/commit/a2a2fc7360c46c2b25c78ed259173434a5ea8ccf), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`ea85297`](https://github.com/schema-engine/schema-engine/commit/ea85297cf18cb1c4d267d57d0637c29a0eedde30), [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75)]:
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
