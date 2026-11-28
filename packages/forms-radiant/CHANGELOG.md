# @schema-engine/forms-radiant

## 0.6.0

### Minor Changes

- [#448](https://github.com/schema-engine/schema-engine/pull/448) [`d19f372`](https://github.com/schema-engine/schema-engine/commit/d19f372888cbde7ea812583a2d51c9d78762ec85) Thanks [@andeeplus](https://github.com/andeeplus)! - Each export has one import path: `@schema-engine/forms-radiant` no longer re-exports `defineRecipeSpec` and `DEFAULT_WIZARD_RECIPE`.

    | Before                                                                 | After                                                             |
    | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
    | `import { defineRecipeSpec } from '@schema-engine/forms-radiant'`      | `import { defineRecipeSpec } from '@schema-engine/forms/recipes'` |
    | `import { DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms-radiant'` | `import { DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms'`    |

    `defineRecipe` is on `@schema-engine/forms-radiant/primitives`, with the other things you build recipes from.

    ```ts
    // before
    import { defineRecipe, defineRecipeSpec, DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms-radiant';
    // after
    import { defineRecipe } from '@schema-engine/forms-radiant/primitives';
    import { defineRecipeSpec } from '@schema-engine/forms/recipes';
    import { DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms';
    ```

- [#456](https://github.com/schema-engine/schema-engine/pull/456) [`d87a667`](https://github.com/schema-engine/schema-engine/commit/d87a667b4ba52e9be042c5841ffa43362289ce27) Thanks [@andeeplus](https://github.com/andeeplus)! - The entries follow the renderer layout shared with forms-react: `.`, `/primitives`, `/debugger` and `/debugger.css` mean the same in both, and forms-radiant adds `/registrations` and `/index.css`.

    - What you build elements and recipes from is on `@schema-engine/forms-radiant/primitives`. `defineRecipe`, `FormElements`, `FormElementsProps`, `FormShellProps`, `FormShellComponent`, `FormMeta` and the `RadiantRecipeAdapterPayload`, `RadiantRecipePayload` and `RadiantRecipeSlotFactory` types move there from the package root. `formInstanceContext`, `formEngineContext` and their `FormInstanceContextValue` and `FormEngineContextValue` types, `combineHandlers` and `mergeFieldGridHost` move there from `/contexts` and `/hooks`, which are removed. Importing `defineRecipe` no longer loads the built-in recipes.
    - `FormDebugger`, `FormDebuggerElement` and `FormDebuggerProps` move from the package root to `@schema-engine/forms-radiant/debugger`, and their styles move out of `index.css` into `@schema-engine/forms-radiant/debugger.css`. An app that does not render the debugger no longer registers `se-form-debugger`, loads its badge or ships its styles.
    - `FormInstance` and `RecipeRenderer` are no longer exported: render forms with `FormRenderer`.
    - On a server, import `@ecopages/radiant/server/install-ssr-runtime` before any forms-radiant entry. Every entry defines custom elements, so importing one in Node without it throws `HTMLElement is not defined`. The server rendering page now says so.

    ```diff
    - import { defineRecipe, type FormShellProps, FormDebugger } from '@schema-engine/forms-radiant';
    - import { formInstanceContext } from '@schema-engine/forms-radiant/contexts';
    - import { combineHandlers } from '@schema-engine/forms-radiant/hooks';
    + import { defineRecipe, type FormShellProps, formInstanceContext, combineHandlers } from '@schema-engine/forms-radiant/primitives';
    + import { FormDebugger } from '@schema-engine/forms-radiant/debugger';
    ```

    ```css
    @import '@schema-engine/forms-radiant/index.css';
    /* only while debugging */
    @import '@schema-engine/forms-radiant/debugger.css';
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

- Updated dependencies [[`1f80c6b`](https://github.com/schema-engine/schema-engine/commit/1f80c6b001fcdbf0b6b038e799bea6aceba62844), [`7d5319a`](https://github.com/schema-engine/schema-engine/commit/7d5319a367314501965b5813ec37b12ecb9cad11), [`2ddce15`](https://github.com/schema-engine/schema-engine/commit/2ddce1566bd4a1812557ddbf65c1af693da5e28f), [`1931b45`](https://github.com/schema-engine/schema-engine/commit/1931b45fe173eaf7dbad57b92d04fb0577c87827), [`b75f9bb`](https://github.com/schema-engine/schema-engine/commit/b75f9bb5b6e158a846773c394660450e00fa26ca), [`d19f372`](https://github.com/schema-engine/schema-engine/commit/d19f372888cbde7ea812583a2d51c9d78762ec85), [`fcc99fc`](https://github.com/schema-engine/schema-engine/commit/fcc99fc74dd68437cde326a58d0bbd3656ffa82f), [`bacef31`](https://github.com/schema-engine/schema-engine/commit/bacef3173f05807b5fed658655d401558450d04c), [`b3302bf`](https://github.com/schema-engine/schema-engine/commit/b3302bff07ae32a812aae17b1ffa4a67a81ed077), [`822d1fd`](https://github.com/schema-engine/schema-engine/commit/822d1fd7d29fa9770abe5fc2eb2b9700899041a7), [`2ddce15`](https://github.com/schema-engine/schema-engine/commit/2ddce1566bd4a1812557ddbf65c1af693da5e28f), [`479f41b`](https://github.com/schema-engine/schema-engine/commit/479f41b3891666cf8da2c949b71b2e8295aca59f), [`5addcce`](https://github.com/schema-engine/schema-engine/commit/5addcceecabfc0d94580435217ce13fc566a3410), [`612d332`](https://github.com/schema-engine/schema-engine/commit/612d33213af7d9a1d2a71ebf7ccddf8279c492c7), [`8608803`](https://github.com/schema-engine/schema-engine/commit/860880328679a5226b96d2cdb03064f9a9403ed3), [`0930f0a`](https://github.com/schema-engine/schema-engine/commit/0930f0a8cab9d4e6e8d78bb36e92c32f01a6ed25), [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609), [`b75f9bb`](https://github.com/schema-engine/schema-engine/commit/b75f9bb5b6e158a846773c394660450e00fa26ca), [`80e9cab`](https://github.com/schema-engine/schema-engine/commit/80e9cab742178fddd421b754a4f368b5ce4b7f26), [`7e86306`](https://github.com/schema-engine/schema-engine/commit/7e86306754c0e1689205c33cafba9fdc07d37aff), [`42a3f6f`](https://github.com/schema-engine/schema-engine/commit/42a3f6fcd76339ad4641d77208095714be63fe36), [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609), [`35c1c5a`](https://github.com/schema-engine/schema-engine/commit/35c1c5ace849ddbf79d4cdab7d32dfb132bc3059), [`5714552`](https://github.com/schema-engine/schema-engine/commit/5714552399a90f1f31ec74df5cbb30c2e83a0892)]:
    - @schema-engine/forms@0.6.0
    - @schema-engine/layout@0.6.0
    - @schema-engine/registry@0.6.0

## 0.5.3

### Patch Changes

- [#427](https://github.com/schema-engine/schema-engine/pull/427) [`73787a2`](https://github.com/schema-engine/schema-engine/commit/73787a276e113037ad03122a90ef880ef936d0e4) Thanks [@andeeplus](https://github.com/andeeplus)! - Bind the elements to the contracts of `@schema-engine/forms/default-elements` instead of defining their schemas again. The 18 `*.types.ts` files now re-export the schemas, types, examples and `xFieldValue` declarations that moved to `@schema-engine/forms` (every name they exported is still exported from the same file, and the `Props` type of each component stays here), and `radiantElements`, a registry made with `bindRegistry(defaultElementContracts, ...)`, adds the Radiant component of each element and the phone input's own validation. Every `XElementRegistration` (and `schemaFormRegistrations`, `FieldSetRegistration`, `ArrayElementRegistration`) is still exported from the same places, now taken from `radiantElements`: the same registration with the same `schema`, and its `schema`, `metadata` and value declaration are shared by identity with the contract. Its type is the contract merged with the Radiant binding rather than `InputRegistration<...>`; it is assignable to it.

    The metadata description of several elements changes to the description shared with the other renderer, the `masked-input` value accepts a number or a date with `unmask: 'typed'` as well as text, and the package now depends on `@schema-engine/registry` (already a dependency of `@schema-engine/forms`).

- [#422](https://github.com/schema-engine/schema-engine/pull/422) [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538) Thanks [@andeeplus](https://github.com/andeeplus)! - `FormController` gains `wizard` and `submission`, signals over the form's wizard (`FormWizard`) and submission that read `undefined` while the form has no runtime and follow the runtime the instance replaces, and `clearSubmission()`. An element no longer needs `formInstanceContext` and `contextSelector` to build a stepper or read the submission. `formInstanceContext` and `FormInstanceContextValue` stay exported from `@schema-engine/forms-radiant/contexts` for the custom blocks and recipes of a renderer; `FormInstanceContextValue` now extends `FormWizard`, with the same fields as before.

- [#429](https://github.com/schema-engine/schema-engine/pull/429) [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75) Thanks [@andeeplus](https://github.com/andeeplus)! - The slot schemas of a recipe spec can be any Standard Schema that validates synchronously: Zod Mini, Valibot or one you write with `standardSchema`. `defineProtocolRecipeSpec` and `defineRecipeSpec` build the view schema themselves, so a spec no longer needs `zod/mini`. A recipe registration carries the slot schemas as `slotSchemas`, and `createRecipeRegistry` (so `createFormEngine`) throws when they do not list exactly the recipe's `slots`, or one is not a Standard Schema. `bindRecipe`, `readSlotConfig`, `getSlotConfig`, `defineFormRecipe`, `defineRecipe` (React and Radiant), `useViewConfig` and `RadiantRecipePayload` take any Standard Schema instead of a Zod one. Specs with Zod Mini slot schemas need no change: the same call gives the same types for `view`, `slotDefaults` and `getSlotConfig`, and the same JSON Schema. In the JSON Schema export, a Zod slot is exported in full, a slot that provides Standard JSON Schema (`~standard.jsonSchema`) is exported as what it returns, and any other slot (Valibot, or a hand-written one without `jsonSchema`) is listed as an open object (`additionalProperties: {}`) with the `appearance` values the recipe declares for it. `@schema-engine/forms-react` and `@schema-engine/forms-radiant` now depend on `@standard-schema/spec` for these types.

    Breaking, and shipped as a patch while the packages have no users outside this repository:

    - `spec.schema` and `recipe.schema` are no longer Zod schemas, so `.parse`, `.safeParse`, `.shape` and passing them to `z.toJSONSchema`, `z.extend` or `z.safeExtend` fail. Validate with `safeParseStandardSchema(spec.schema, view)` from `@schema-engine/registry` (or `safeParseNode`), get a JSON Schema from the forms engine (`describeRecipe`, `generateJSONSchemaCollection`), and compose from `spec.slotSchemas`.
    - `RecipeViewSchema<TType, TSlots>` is now a `StandardSchemaV1<Input, Output>`, not a `ZodMiniObject`. Read its types with `StandardSchemaV1.InferInput` and `InferOutput`.
    - `appearanceAxes` on a slot whose schema input has no `appearance` key is a compile error, for every slot schema and not only strict Zod objects. A non-strict `z.object` slot without an `appearance` key used to pass, because it dropped the key instead of rejecting it; it now fails to compile. The runtime check that probed the schema for the key is gone, since Standard Schema reports no issue codes to probe with, and `resolveRecipeView` removes `appearance` before the slot schema parses. A spec cast past the types now fails only at compile time. Migration: add `appearance: z.optional(AppearanceConfigSchema)` (or the library's equivalent) to the slot schema, or use a loose object; a hand-written slot states its input type with `standardSchema<TOutput, TInput>`.
    - Messages changed. A key the recipe does not declare is an issue at that key (`Recipe 'x' does not accept view key 'y'. Allowed: ...`) and not an `unrecognized_keys` issue at the view. A bad `slotDefaults` entry reads `slotDefaults.<slot> is invalid: <path>: <message>`, with the message of the slot library and the offending key in the path (an unknown key a library reports on the object, as Zod does, is named at the key).

- [#425](https://github.com/schema-engine/schema-engine/pull/425) [`2b3ae61`](https://github.com/schema-engine/schema-engine/commit/2b3ae61d13c8a8dfaead4d3fef1d74e2566c2011) Thanks [@andeeplus](https://github.com/andeeplus)! - Under a layout theme with `grid: { query: 'container' }`, both renderers wrap each grid (a step's, and the inner grid of each fieldset and array row) in an element with the `se-grid-container` class, so the breakpoints follow the width of the grid's wrapper and a nested grid follows its own. A theme that queries the window renders the markup it always did. `ChildGrid`, exported from `@schema-engine/forms-react/primitives` and `@schema-engine/forms-radiant/primitives`, lays out the children of a container element you write: it renders the grid and, under a container theme, its wrapper. `useChildGridProps` (forms-react) and `mergeChildrenGridHost` (forms-radiant) are removed from the public API: use `ChildGrid`, which renders the same grid and, under a container theme, the wrapper its breakpoints need (a breaking removal shipped as a patch, like the `useFormWizard` rename). The shadcn registry's fieldset and array rows use `ChildGrid`. The Radiant stylesheet drops a `form.rui-form:has(> .se-form-elements)` rule that no markup matched.

- [#426](https://github.com/schema-engine/schema-engine/pull/426) [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375) Thanks [@andeeplus](https://github.com/andeeplus)! - A fieldset with `grid: { subgrid: true }` lays its fields on the column tracks and gap of the grid it sits in, so they line up with the fields around it. `ChildGrid` takes either `elements` or `subgrid` (passing both is a type error) for a container you write: with `subgrid` it renders the grid with the `se-subgrid` class, no inline track variables and, in container mode, no `se-grid-container` wrapper. A `ChildGrid` without it, and a step's grid, count the widths of the children of a subgrid element among their own. In both renderers a subgrid fieldset is a `div` with `role="group"` labelled by its legend, instead of a `<fieldset>`, because Chromium cannot make a fieldset a subgrid; the shadcn registry adds a `FieldLegend` primitive for it. The Radiant one keeps the fieldset's border and padding, so its legend is a heading row rather than a gap in the border, and the first and last columns are inset by that border and padding. A subgrid fieldset behind a constraint puts the class on the constraint host too. Forms without `subgrid` render the markup they did.
- Updated dependencies [[`5220973`](https://github.com/schema-engine/schema-engine/commit/5220973b4ef4a1c766deae90754448d0354f7c3c), [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538), [`8c6eb8b`](https://github.com/schema-engine/schema-engine/commit/8c6eb8b24e431faed08eaa31d815e364557a310b), [`73787a2`](https://github.com/schema-engine/schema-engine/commit/73787a276e113037ad03122a90ef880ef936d0e4), [`81147d5`](https://github.com/schema-engine/schema-engine/commit/81147d5b685f74ea6aecff1ec9cc803808ec284f), [`5311534`](https://github.com/schema-engine/schema-engine/commit/5311534a1d22902fa95174e455bbcafa0f38eda2), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`61750ae`](https://github.com/schema-engine/schema-engine/commit/61750ae1c1739331d93590d4b745cff7847fdbcc), [`81147d5`](https://github.com/schema-engine/schema-engine/commit/81147d5b685f74ea6aecff1ec9cc803808ec284f), [`a2a2fc7`](https://github.com/schema-engine/schema-engine/commit/a2a2fc7360c46c2b25c78ed259173434a5ea8ccf), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`ea85297`](https://github.com/schema-engine/schema-engine/commit/ea85297cf18cb1c4d267d57d0637c29a0eedde30), [`02f21c9`](https://github.com/schema-engine/schema-engine/commit/02f21c9ddc51e0b1d7712854707580f5b4e895d0), [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75), [`67e2556`](https://github.com/schema-engine/schema-engine/commit/67e25562959cc0242a56a59ec8d982f6e21fc93b), [`bdff897`](https://github.com/schema-engine/schema-engine/commit/bdff897952056ea0a4033e014692f5afc78c96d0), [`40a3d6f`](https://github.com/schema-engine/schema-engine/commit/40a3d6f8f111ebcd00cad0e72d056d5aa3710488), [`a719ba4`](https://github.com/schema-engine/schema-engine/commit/a719ba4e773cd3223bb7e4e6723e82a1006d1874), [`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0), [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75)]:
    - @schema-engine/forms@0.5.3
    - @schema-engine/layout@0.5.2
    - @schema-engine/actions@0.5.2
    - @schema-engine/registry@0.5.2

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
