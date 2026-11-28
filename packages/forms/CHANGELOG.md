# @schema-engine/forms

## 0.6.0

### Minor Changes

- [#449](https://github.com/schema-engine/schema-engine/pull/449) [`1f80c6b`](https://github.com/schema-engine/schema-engine/commit/1f80c6b001fcdbf0b6b038e799bea6aceba62844) Thanks [@andeeplus](https://github.com/andeeplus)! - Containers declare their children with `childPaths`, and forms checks an element tree with the registry's `safeParseTree`. An element that holds `elements` adds `childPaths: [{ keys: ['elements'], list: true }]` to its registration. Add `accepts: ['tab']` to limit which elements it takes: an element outside the list is a `registry/not-accepted` issue at its `$type`. The schema still declares `elements`.

    - `containerKind` only says how the children make the value (`'object'` or `'array'`), so a container written with a Valibot or a hand-written schema declares `childPaths` as well, and `containerKind` without `childPaths` throws when the engine is built (and is a type error). `value` is required exactly when there is no `childPaths`, for a schema of any Standard Schema library: a container that declares one throws.
    - Only an input can be a container, and only under `elements`. `childPaths: undefined` is no declaration: the input still declares `value`. `createFormEngine` throws for a `static` element with `childPaths`, and for any other key or more than one path. In a form, an element without `childPaths` that holds `elements` is an issue at its `elements` key (`Element 'note' declares no child path, so it cannot hold elements.`); its children are not checked, and its other checks (rules, name, grid, appearance) still run. No step check sees them either: the retained config of such an element has no `elements`.
    - A schema that declares `elements` and a registration without `childPaths` no longer compiles. The error names `elementsWithoutChildPaths` and the `$type`.
    - Children are checked as the author wrote them, with the registry's rules. A container schema that drops, renames or resizes `elements`, or defaults it to a list that holds elements, now throws `RegistryError` with the code `'schema-breaks-child-path'`, and a transform that reorders the children is ignored: issues and the normalized form keep the authored order. A schema still never sees an element's `appearance`, which the engine resolves and writes back, so a strict schema supports axes.
    - The default `fieldSet` and `arrayElements` contracts, and the elements of Forms React and Forms Radiant that spread them, declare `childPaths` already. A copied shadcn fieldset or array item spreads its contract and needs no change. A custom widget built on `ArrayElementConfigSchema` or `FieldSetConfigSchema` adds `childPaths`.
    - `ElementChildPaths` is exported as a type.
    - A form's issues are reported in one pass. Forms' checks (names, rules, grid, appearance) run on every element whose own schema passed, even when another element in the same container failed, and a node whose own check fails still has its children checked. The order for a top-level element is the registry's issues first, then forms', parent before children, in document order. The step checks see the same elements: an element with an issue still counts for grid placement, payload key collisions and the fields a later step's constraint may read. A top-level element that is not an object, or has no `$type`, is now an issue of that element (`registry/not-an-object` at the element, `registry/missing-type` at its `$type`) beside the issues of every other element, instead of an envelope issue that stopped the form, and a cycle is reported at its first repeat. The same holds for actions: an entry of `actions` (the form's or a step's) with no registered `$type`, an empty one included, is that entry's issue, and no longer an envelope issue that stopped every other check.
    - An element whose schema drops or changes its `$type`, or returns something that is not an object, now throws `RegistryError` with the code `'schema-changes-type'` instead of being a document issue.
    - A static element cannot be a container: a static layout element that holds `elements` becomes `defineInput` with `childPaths`, and `defineStatic` with a schema that declares `elements` does not compile (`elementsWithoutChildPaths`). Children that a schema adds to an element that declares no `childPaths` (a default, say) are the same issue at its `elements` key, and are never branded as checked.

    ```ts
    // before
    defineInput({ $type: 'group', schema: GroupSchema /* declares elements */, metadata, render: Group });
    defineInput({ $type: 'v-group', schema: valibotGroup, containerKind: 'object', metadata, render });

    // after
    defineInput({
    	$type: 'group',
    	schema: GroupSchema,
    	childPaths: [{ keys: ['elements'], list: true }],
    	metadata,
    	render: Group,
    });
    defineInput({
    	$type: 'tabs',
    	schema: TabsSchema,
    	childPaths: [{ keys: ['elements'], list: true, accepts: ['tab'] }],
    	metadata,
    	render: Tabs,
    });
    defineInput({
    	$type: 'v-group',
    	schema: valibotGroup,
    	childPaths: [{ keys: ['elements'], list: true }],
    	metadata,
    	render,
    });
    ```

- [#446](https://github.com/schema-engine/schema-engine/pull/446) [`7d5319a`](https://github.com/schema-engine/schema-engine/commit/7d5319a367314501965b5813ec37b12ecb9cad11) Thanks [@andeeplus](https://github.com/andeeplus)! - `FormEngine` exposes its registries as readonly properties, and the 13 methods that read them are removed. `engine.elements`, `engine.recipes`, `engine.actions` and `engine.validations` are the read-only registries the engine already held (`ElementRegistry`, `RecipeRegistry`, `ActionRegistry` and `ValidationRegistry`), so each has `get`, `has`, `all`, `keys`, `size` and `kind`.

    | Before                                                   | After                                                    |
    | -------------------------------------------------------- | -------------------------------------------------------- |
    | `getElement(id)`, `getRecipe(id)`, `getAction(id)`       | `elements.get(id)`, `recipes.get(id)`, `actions.get(id)` |
    | `hasElement(id)`, `hasRecipe(id)`, `hasAction(id)`       | `elements.has(id)`, `recipes.has(id)`, `actions.has(id)` |
    | `getAllElements()`, `getAllRecipes()`, `getAllActions()` | `elements.all()`, `recipes.all()`, `actions.all()`       |
    | `getElementIds()`, `getRecipeIds()`, `getActionTypes()`  | `elements.keys()`, `recipes.keys()`, `actions.keys()`    |
    | `getValidationRegistry()`                                | `validations`                                            |

    `getAll*()` and `get*Ids()` returned mutable copies. `all()` and `keys()` return frozen arrays, so copy one (`[...engine.elements.all()]`) before sorting or changing it.

    `engine.elements`, `engine.recipes` and `engine.actions` carry the hint of an unregistered `$type` (`Register it with createFormEngine({ actions: [...] }).`), so `parseActions(engine.actions, input)` reports it.

    `getViewRecipe(engine, config)` from `@schema-engine/forms/recipes` takes `{ readonly recipes: RecipeRegistry }` instead of `{ getRecipe(id) }`: a `FormEngine` still works, and a hand-written `{ getRecipe }` adapter breaks.

    `engine.actions` is a lookup the actions package takes as it is: `ActionDispatcher` and `parseActions` no longer take the engine itself, but its registry.

    ```ts
    // before
    const types = engine.getAllElements().map(({ $type }) => $type);
    const registry = engine.getValidationRegistry();
    const dispatcher = new ActionDispatcher(engine);
    // after
    const types = engine.elements.all().map(({ $type }) => $type);
    const registry = engine.validations;
    const dispatcher = new ActionDispatcher(engine.actions);
    ```

    A test that replaced a method with `vi.spyOn(engine, 'getAction')` registers the action it needs with `createFormEngine({ actions: [...] })` instead: the registries are frozen.

- [#451](https://github.com/schema-engine/schema-engine/pull/451) [`2ddce15`](https://github.com/schema-engine/schema-engine/commit/2ddce1566bd4a1812557ddbf65c1af693da5e28f) Thanks [@andeeplus](https://github.com/andeeplus)! - **The engine no longer exposes its schema internals, and the JSON Schema export types the children of every container.** `engine.getSchemaArtifacts()`, `engine.getSchemaRegistry()` and `engine.getFormConfigSchema()` are removed: they returned Zod objects, so keeping them froze how the export is composed. Validate a form config with `engine.validateForm` or `engine.safeValidateForm`. Export JSON Schema with `generateFormConfigSchema`, `generateJSONSchemaCollection` or `generateActionConfigSchema`, or hand `getFormConfigStandardSchema()` to a tool that takes Standard JSON Schema. Read titles and descriptions with `getSchemaCatalog()`.

    ```ts
    // before
    engine.getFormConfigSchema().safeParse(config).success;
    // after
    engine.safeValidateForm(config).success;
    ```

    In the export, the `elements` of every container are now typed by what the container accepts, whichever library wrote its schema. Before, only a Zod schema whose `elements` was a plain array, a pipe or a prefault was typed, so a Valibot or hand-written container, a Standard JSON Schema one, and a Zod container whose `elements` was `optional`, `default`, `nullable` or `readonly` listed children that accepted any object, and `accepts` was not in the export.

    - Each child is `{ anyOf: [{ $ref }, ...] }` over the `accepts` of the container's `childPaths` (every element of the engine without `accepts`), in `generateFormConfigSchema()`, `generateJSONSchemaCollection()` and the Standard JSON Schema getters. The items of the list change, and its `required`, `minItems` and `maxItems` stay.
    - An element whose schema the export cannot read (a Valibot schema, a hand-written one) is listed by an object that holds its `$type`, its appearance axes and, for a container, an optional `elements` list, typed the same way. Such an element is now an entry of `generateJSONSchemaCollection()` and a definition of the form config, as every other element is.
    - Two mistakes throw a `RegistryError` when you export (not when the engine is built): `'unknown-accepted-type'` when `accepts` names a `$type` that no element registers, and `'unreachable-child-path'` when the container's `elements` is nullable or behind `allOf`, a union or a reference.
    - The element union that children refer to is no longer a shared `__schema0` definition: each child refers to the definition of an element (`#/$defs/element:tab`, or its URI in a collection).
    - An open slot is a list for every source: a container written as a Standard JSON Schema with an open `elements` (`{}`) exports `{ type: 'array', items: ... }`, not a child or a list of children. Forms reads `elements` only as a list, so a container declares it with `list: true` (below) and `validateForm` reports `registry/not-a-list` at the `elements` key of a container whose schema let one object through, which was silently dropped before.
    - An element, an action or a recipe whose schema the export cannot read is a definition of the form config and an entry of `generateJSONSchemaCollection()`, as one that exports itself is, instead of an inline object. `generateActionConfigSchema(type)` and `getActionConfigStandardSchema(type)` now answer for such an action with the object that holds its `$type`, where they returned `undefined`.

    **`FormEngine` is a type, and `createFormEngine` is the one way to make an engine.** The class and its constructor were exported, and `new FormEngine(registries)` took the schema artifacts, so the removed internals stayed reachable. Use `createFormEngine`, and import `FormEngine` as a type.

    ```ts
    // before
    import { FormEngine } from '@schema-engine/forms';
    const engine = new FormEngine(registries);
    // after
    import { createFormEngine, type FormEngine } from '@schema-engine/forms';
    const engine: FormEngine = createFormEngine({ elements, recipes, actions });
    ```

    **A container declares `list: true`.** The child path of a container is `{ keys: ['elements'], list: true }`, and `createFormEngine` throws, and the type refuses, a container without it. The registry's own `list` says the slot is a list (see the registry changeset), so a value that is not an array is `registry/not-a-list`, the export writes the slot as an array and the types read it as one. Copied shadcn fieldset and array items spread their contract and need no change; a custom container adds `list: true`.

    ```ts
    // before
    defineInput({ $type: 'group', schema: GroupSchema, childPaths: [{ keys: ['elements'] }], metadata, render: Group });
    // after
    defineInput({
    	$type: 'group',
    	schema: GroupSchema,
    	childPaths: [{ keys: ['elements'], list: true }],
    	metadata,
    	render: Group,
    });
    ```

    An open action is listed with the action envelope: it requires an `id` and allows `enabled` and `triggers`, as every Zod action does.

- [#455](https://github.com/schema-engine/schema-engine/pull/455) [`1931b45`](https://github.com/schema-engine/schema-engine/commit/1931b45fe173eaf7dbad57b92d04fb0577c87827) Thanks [@andeeplus](https://github.com/andeeplus)! - The root entry exports less, errors carry a code, and a container's child paths are checked in the types.

    - `ActionRegistrationRegistry` is renamed `ActionRegistry`, beside `ElementRegistry` and `RecipeRegistry`. It is the type of `engine.actions`.
    - `defineInput` and `defineInputContract` check `childPaths` as `createRegistry` does: a key the schema does not declare is the compile error `childPathNotInSchema`, and `list: true` over a slot the schema types as no array is `listPathNotAnArray`. A container whose schema is `z.object({ $type: z.literal('group') })` no longer compiles, where `generateFormConfigSchema` used to throw `'unreachable-child-path'` later. A schema that types `elements` as `z.unknown()` is not checked, since it can hold a list.
    - The errors `createFormEngine` throws for an element registration are `RegistryError`s with a `code`, where they were plain `Error`s. `'invalid-child-paths'` covers `childPaths` on a static element, more than one path, a key other than `elements`, a path without `list: true`, and `containerKind` without `childPaths`. The new `'invalid-declaration'` of `@schema-engine/registry` covers an element that states no `kind`, an input that declares neither `value` nor `childPaths`, a container that declares a `value`, and an element that declares an appearance axis the layout theme lacks. The messages are unchanged.
    - `ValidationRuleError`, which `ValidationRegistry.createSchema` throws for an unregistered rule `$type` or a handler that throws, is exported, so `instanceof` works.
    - Import `ValidationStep` and `ValidationElement` from the root to type the read-only shapes accepted by value validation and participation.
    - Recipe registration checks report `RegistryError` with `kind: 'Recipe'` and the recipe's `$type`. Branch on `'invalid-declaration'` for an invalid protocol or slot declaration and `'invalid-schema'` for a slot schema that does not implement Standard Schema.

    Removed from the root entry:

    | Removed                                                   | Instead                                                                                                                                         |
    | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
    | `ValidateFormOptions`                                     | Nothing: it typed the options of `validateFormConfig`, which is not exported. Validate with `engine.validateForm` or `engine.safeValidateForm`. |
    | `markNormalizedFormConfig`, `markNormalizedElementConfig` | `engine.defineForm`, `engine.validateForm` and `engine.validateElement`. Only an engine brands a config, after it validated it.                 |
    | `validateRegistrationConfig(schema, config)`              | `safeParseStandardSchema(schema, config)` of `@schema-engine/registry`, which returns `{ success, data }` or `{ success, error }`.              |
    | `ValidationElementTree`                                   | `readonly ValidationElement[]`                                                                                                                  |

- [#447](https://github.com/schema-engine/schema-engine/pull/447) [`b75f9bb`](https://github.com/schema-engine/schema-engine/commit/b75f9bb5b6e158a846773c394660450e00fa26ca) Thanks [@andeeplus](https://github.com/andeeplus)! - **JSON Schema targets use the Standard JSON Schema names, and an unsupported target throws.** Write `'draft-07'` and `'draft-04'` instead of `'draft-7'` and `'draft-4'` in `generateFormConfigSchema`, `generateJSONSchemaCollection` and `generateActionConfigSchema`. Their `target` is now `JSONSchemaTarget` from `@schema-engine/registry`: `'draft-2020-12'` (the default), `'draft-07'`, `'draft-04'` or `'openapi-3.0'`. Any other target, a misspelling included, throws before a schema is converted. The Standard converters of `getFormConfigStandardSchema()` and `getActionConfigStandardSchema()` throw the same way, where they used to hand the string to Zod, and `submissionSchema(config)` keeps writing `'draft-2020-12'`, `'draft-07'` and `'openapi-3.0'`.

    ```ts
    // before
    engine.generateFormConfigSchema({ target: 'draft-7' });
    engine.generateJSONSchemaCollection({ target: 'draft-4' });
    // after
    engine.generateFormConfigSchema({ target: 'draft-07' });
    engine.generateJSONSchemaCollection({ target: 'draft-04' });
    ```

    A `'draft-04'` export addresses its collection entries and its form config document by `id`, the identifier a draft-04 validator reads, where it wrote `$id`, so the `uri` references between entries resolve.

- [#448](https://github.com/schema-engine/schema-engine/pull/448) [`d19f372`](https://github.com/schema-engine/schema-engine/commit/d19f372888cbde7ea812583a2d51c9d78762ec85) Thanks [@andeeplus](https://github.com/andeeplus)! - Each export has one import path: `@schema-engine/forms` and `@schema-engine/forms/recipes` no longer re-export what another package declares. Import `formatIssuePath` from `@schema-engine/registry`, and the three recipe types from `@schema-engine/layout`.

    | Before                                                                   | After                                                             |
    | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
    | `import { formatIssuePath } from '@schema-engine/forms'`                 | `import { formatIssuePath } from '@schema-engine/registry'`       |
    | `import type { RecipeMetadata } from '@schema-engine/forms/recipes'`     | `import type { RecipeMetadata } from '@schema-engine/layout'`     |
    | `import type { RecipeSlotDefaults } from '@schema-engine/forms/recipes'` | `import type { RecipeSlotDefaults } from '@schema-engine/layout'` |
    | `import type { RecipeViewSchema } from '@schema-engine/forms/recipes'`   | `import type { RecipeViewSchema } from '@schema-engine/layout'`   |

    `defineRecipeSpec` stays on `@schema-engine/forms/recipes` and `DEFAULT_WIZARD_RECIPE` on `@schema-engine/forms`: they are what `@schema-engine/forms-radiant` re-exported, and it no longer does. `@schema-engine/layout` and `@schema-engine/registry` are dependencies of `@schema-engine/forms`, so a project that imports them directly lists them in its own `package.json`.

- [#442](https://github.com/schema-engine/schema-engine/pull/442) [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609) Thanks [@andeeplus](https://github.com/andeeplus)! - The issues the registry creates reach the callers of `parseActions` and `validateForm` with their namespaced `code`. An unregistered `$type`, a node that is not an object and a node without a `$type` have the code `registry/unregistered-type`, `registry/not-an-object` and `registry/missing-type`. `ParseActionsResult` types its issues as the registry's `RegistryIssue`, and a form issue from the registry has `code` and `params` (`{ received }` for an unregistered `$type`), so an editor can localize it like a schema issue. Messages and paths are unchanged, and an issue the actions or forms engine finds itself still has no code.

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

- Updated dependencies [[`80e9cab`](https://github.com/schema-engine/schema-engine/commit/80e9cab742178fddd421b754a4f368b5ce4b7f26), [`fcc99fc`](https://github.com/schema-engine/schema-engine/commit/fcc99fc74dd68437cde326a58d0bbd3656ffa82f), [`bacef31`](https://github.com/schema-engine/schema-engine/commit/bacef3173f05807b5fed658655d401558450d04c), [`b3302bf`](https://github.com/schema-engine/schema-engine/commit/b3302bff07ae32a812aae17b1ffa4a67a81ed077), [`822d1fd`](https://github.com/schema-engine/schema-engine/commit/822d1fd7d29fa9770abe5fc2eb2b9700899041a7), [`2ddce15`](https://github.com/schema-engine/schema-engine/commit/2ddce1566bd4a1812557ddbf65c1af693da5e28f), [`479f41b`](https://github.com/schema-engine/schema-engine/commit/479f41b3891666cf8da2c949b71b2e8295aca59f), [`5addcce`](https://github.com/schema-engine/schema-engine/commit/5addcceecabfc0d94580435217ce13fc566a3410), [`612d332`](https://github.com/schema-engine/schema-engine/commit/612d33213af7d9a1d2a71ebf7ccddf8279c492c7), [`8608803`](https://github.com/schema-engine/schema-engine/commit/860880328679a5226b96d2cdb03064f9a9403ed3), [`0930f0a`](https://github.com/schema-engine/schema-engine/commit/0930f0a8cab9d4e6e8d78bb36e92c32f01a6ed25), [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609), [`b75f9bb`](https://github.com/schema-engine/schema-engine/commit/b75f9bb5b6e158a846773c394660450e00fa26ca), [`80e9cab`](https://github.com/schema-engine/schema-engine/commit/80e9cab742178fddd421b754a4f368b5ce4b7f26), [`7e86306`](https://github.com/schema-engine/schema-engine/commit/7e86306754c0e1689205c33cafba9fdc07d37aff), [`42a3f6f`](https://github.com/schema-engine/schema-engine/commit/42a3f6fcd76339ad4641d77208095714be63fe36), [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609), [`35c1c5a`](https://github.com/schema-engine/schema-engine/commit/35c1c5ace849ddbf79d4cdab7d32dfb132bc3059), [`5714552`](https://github.com/schema-engine/schema-engine/commit/5714552399a90f1f31ec74df5cbb30c2e83a0892)]:
    - @schema-engine/actions@0.6.0
    - @schema-engine/layout@0.6.0
    - @schema-engine/registry@0.6.0

## 0.5.3

### Patch Changes

- [#424](https://github.com/schema-engine/schema-engine/pull/424) [`5220973`](https://github.com/schema-engine/schema-engine/commit/5220973b4ef4a1c766deae90754448d0354f7c3c) Thanks [@andeeplus](https://github.com/andeeplus)! - Each step in the runtime snapshot, and so in `FormWizard`, carries its `title` from the step config, so a stepper reads `step.title` instead of looking it up by id in its own copy of the config. A step of a validated form config always has one; `title` is optional in the type only because `FormRuntimeStep`, which a hand-built runtime config uses, does not require it.

- [#422](https://github.com/schema-engine/schema-engine/pull/422) [`bd9ad38`](https://github.com/schema-engine/schema-engine/commit/bd9ad38ce401866f163b102c131ecd2ff9e19538) Thanks [@andeeplus](https://github.com/andeeplus)! - Adds the `FormWizard` type: the current step, every step's state, `navigating` and the commands `next`, `back` and `goTo`, which each renderer hands to its app (`useFormWizard()` in React, `FormController.wizard` in Radiant).

- [#415](https://github.com/schema-engine/schema-engine/pull/415) [`8c6eb8b`](https://github.com/schema-engine/schema-engine/commit/8c6eb8b24e431faed08eaa31d815e364557a310b) Thanks [@andeeplus](https://github.com/andeeplus)! - `formatIssuePath` now lives in `@schema-engine/registry`; import it from there. `@schema-engine/forms` still re-exports it, so existing imports keep working. Its output for the paths it already took is unchanged, and it now also takes a missing path and the `{ key }` segments of a Standard Schema issue.

    An action of a form or of a step whose `$type` no registration answers is now reported as `No registration for $type '<type>'. Register it with createFormEngine({ actions: [...] }).` (it was `Unknown action type '<type>'. Register it in the action registry.`), at the same path, because `parseActions` now checks each entry with `safeParseNode`.

- [#427](https://github.com/schema-engine/schema-engine/pull/427) [`73787a2`](https://github.com/schema-engine/schema-engine/commit/73787a276e113037ad03122a90ef880ef936d0e4) Thanks [@andeeplus](https://github.com/andeeplus)! - Add the `@schema-engine/forms/default-elements` entry, which holds the contract of each of the 18 default elements: `input`, `textarea`, `number`, `select`, `checkbox`, `checkbox-group`, `switch`, `radio`, `slider`, `combobox`, `drop-zone`, `fieldSet`, `input-otp`, `phone-input`, `masked-input`, `arrayElements`, `submit` and `submission-alert`. A contract (`CheckboxElementContract`) is an element registration without `render` and `validations`: its `$type`, schema, metadata, value declaration, container kind and appearance axes, so every renderer of an element agrees on them. The entry also exports each element's schema, types and `xFieldValue` declaration (`CheckboxFieldConfigSchema`, `CheckboxFieldConfig`, `checkboxFieldValue`, and so on, the same names the renderers exported until now), `defaultElementContracts` (a registry of all of them, built with `createRegistry` and `duplicates: 'error'`), and the types `ElementBindings`, `ElementBinding`, `InputContract` and `StaticContract`. A renderer binds `render` to a contract with `defineInput({ ...CheckboxElementContract, render })`, or binds every contract at once with `bindRegistry(defaultElementContracts, bindings)` from `@schema-engine/registry`, with `bindings satisfies ElementBindings<typeof defaultElementContracts>` checking each `render` against its own schema.

    Where the two renderers had drifted, the contract is the one both now share: the `masked-input` value accepts text, a number or a date with `unmask: 'typed'` (it was text only in Radiant), the `input-otp` completeness rule is `^.{length}$` (the pattern rule skips an empty value, so an empty optional code stays valid), the `arrayElements` `initialValues` record holds `unknown` (the shadcn copy held `any`), the slider value falls back to the bounds 0 and 100, and each element has one `metadata` name and description (`OTP Input`, `Masked Input`, `Phone Input`, and the longer descriptions of the shadcn copies).

- [#432](https://github.com/schema-engine/schema-engine/pull/432) [`81147d5`](https://github.com/schema-engine/schema-engine/commit/81147d5b685f74ea6aecff1ec9cc803808ec284f) Thanks [@andeeplus](https://github.com/andeeplus)! - Validation checks `grid.span`. A field that sets `span` and `width`, `offset`, `column` or `area` in one breakpoint is rejected at the conflicting key, a `span` under a grid whose `columns` are `'auto'` at any breakpoint is rejected at the `span` key (CSS cannot count the tracks of `auto`, so the span would be one track), and so is a `span` on a subgrid. A span inside a subgrid is checked against the grid the subgrid sits on. `autoFlow` is accepted on a form's or a step's grid and rejected inside `responsive`.

- [#433](https://github.com/schema-engine/schema-engine/pull/433) [`5311534`](https://github.com/schema-engine/schema-engine/commit/5311534a1d22902fa95174e455bbcafa0f38eda2) Thanks [@andeeplus](https://github.com/andeeplus)! - The JSON Schema export reads the schema of every registration kind (an element, an action, a validation rule and a recipe slot) by one rule. A Zod schema, classic or Mini, goes through the Zod converter as before. Any other schema that provides Standard JSON Schema (`~standard.jsonSchema`), such as ArkType or a schema you write, is now exported as what its `input()` or `output()` returns for the `io` and `target` you ask for, where it used to be listed by its shape. A schema that provides neither is still listed by its shape; Valibot and Effect Schema do not provide `~standard.jsonSchema`, so they still are.

    How such a schema is embedded: its `$schema` is dropped; a schema whose `$ref`s point into itself (ArkType's recursive types) is moved to the document's definitions as `embedded-1` and so on, or to a collection entry of its own, so its references still resolve (only the schema's own resource is rewritten, so a nested subschema with its own `$id` keeps its references); the anchors (`$anchor`, `$dynamicAnchor`, a draft-07 `$id: '#name'`) of each embedded schema carry its place (`embedded-1-node`), so two schemas that declare the same one do not clash; a document keeps the catalog metadata (`title`, `description`, `componentType`, `category`) beside the schema's keywords where it does not set them; and a converter that throws for the target (ArkType for `openapi-3.0`) lists the schema by its shape and logs a warning instead of failing the export.

    `submissionSchema(config)` reads its value schemas by the same rule. A classic Zod value schema now goes through the Zod converter like a Zod Mini one, so a type JSON Schema cannot represent (a date) is written as `{}` instead of throwing. A value schema's `$schema` is dropped and a recursive one is moved to the submission schema's definitions.

- [#426](https://github.com/schema-engine/schema-engine/pull/426) [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375) Thanks [@andeeplus](https://github.com/andeeplus)! - Validation checks `grid.subgrid`. A subgrid must be a container that holds elements and sets no `width`, `offset`, `column`, `area`, `justifySelf` or `placeSelf`; it is rejected under a grid that draws `areas`, on an array (subgrid rows are not supported yet), and inside `responsive`. A `width` or `offset` inside a subgrid now counts against the grid it sits in, so it conflicts with that grid's `columns`, `minColumnWidth` or `areas`, at the inner element's own key. The new `gridTrackItems(elements)` returns the elements that count a grid's tracks, the children of every subgrid included; the renderers pass it to `getGridVariables`.

- [#419](https://github.com/schema-engine/schema-engine/pull/419) [`ea85297`](https://github.com/schema-engine/schema-engine/commit/ea85297cf18cb1c4d267d57d0637c29a0eedde30) Thanks [@andeeplus](https://github.com/andeeplus)! - The checks of an element, a view recipe and a validation rule use `safeParseNode` from `@schema-engine/registry`, like the actions of a form, so each says the same thing about a `$type` it cannot use, and keeps its hint on where to register it:

    - An element `$type` nothing registers is `No registration for $type 'phone'. Register it with createFormEngine({ elements: [...] }).` (it was `Unknown element type 'phone'. Register it with createFormEngine({ elements: [...] }).`), at the same path.
    - A `view.$type` nothing registers is `No registration for $type 'nope'. Register it with createFormEngine({ recipes: [...] }).` (it was `Unknown view recipe 'nope'. Register it with createFormEngine({ recipes: [...] }).`), at the same path. An empty `view.$type` is now reported as an unregistered type; it was `Must be a non-empty string.`.
    - A rule `$type` nothing registers is `No registration for $type 'postalcode'. Register it with createFormEngine({ validations: [...] }). Registered rules: required, ...` (it was `Unknown validation rule 'postalcode'. Register it with createFormEngine({ validations: [...] }). Registered rules: required, ...`), at the same path, and the error `createSchema` throws for it says the same.
    - `validateElement` and `validateElementConfig` given a value that is not an object report `Expected an object with a string $type.` at `[]` (it was `Invalid element configuration: missing $type.` at `['$type']`), and an object without a string `$type` reports `Expected a string $type.` at `['$type']` (it was `Invalid element configuration: missing $type.`, at the same path). The same applies to a child of an element when its container's schema does not check the children: a container that uses `elementChildrenSchema` still reports a child that is not an object or has no `$type` itself, so those issues are unchanged, and a custom container that does not use it now reports the child with these messages at the child's path.

    The other issues, their paths and the normalized result are unchanged.

- [#429](https://github.com/schema-engine/schema-engine/pull/429) [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75) Thanks [@andeeplus](https://github.com/andeeplus)! - The slot schemas of a recipe spec can be any Standard Schema that validates synchronously: Zod Mini, Valibot or one you write with `standardSchema`. `defineProtocolRecipeSpec` and `defineRecipeSpec` build the view schema themselves, so a spec no longer needs `zod/mini`. A recipe registration carries the slot schemas as `slotSchemas`, and `createRecipeRegistry` (so `createFormEngine`) throws when they do not list exactly the recipe's `slots`, or one is not a Standard Schema. `bindRecipe`, `readSlotConfig`, `getSlotConfig`, `defineFormRecipe`, `defineRecipe` (React and Radiant), `useViewConfig` and `RadiantRecipePayload` take any Standard Schema instead of a Zod one. Specs with Zod Mini slot schemas need no change: the same call gives the same types for `view`, `slotDefaults` and `getSlotConfig`, and the same JSON Schema. In the JSON Schema export, a Zod slot is exported in full, a slot that provides Standard JSON Schema (`~standard.jsonSchema`) is exported as what it returns, and any other slot (Valibot, or a hand-written one without `jsonSchema`) is listed as an open object (`additionalProperties: {}`) with the `appearance` values the recipe declares for it. `@schema-engine/forms-react` and `@schema-engine/forms-radiant` now depend on `@standard-schema/spec` for these types.

    Breaking, and shipped as a patch while the packages have no users outside this repository:

    - `spec.schema` and `recipe.schema` are no longer Zod schemas, so `.parse`, `.safeParse`, `.shape` and passing them to `z.toJSONSchema`, `z.extend` or `z.safeExtend` fail. Validate with `safeParseStandardSchema(spec.schema, view)` from `@schema-engine/registry` (or `safeParseNode`), get a JSON Schema from the forms engine (`describeRecipe`, `generateJSONSchemaCollection`), and compose from `spec.slotSchemas`.
    - `RecipeViewSchema<TType, TSlots>` is now a `StandardSchemaV1<Input, Output>`, not a `ZodMiniObject`. Read its types with `StandardSchemaV1.InferInput` and `InferOutput`.
    - `appearanceAxes` on a slot whose schema input has no `appearance` key is a compile error, for every slot schema and not only strict Zod objects. A non-strict `z.object` slot without an `appearance` key used to pass, because it dropped the key instead of rejecting it; it now fails to compile. The runtime check that probed the schema for the key is gone, since Standard Schema reports no issue codes to probe with, and `resolveRecipeView` removes `appearance` before the slot schema parses. A spec cast past the types now fails only at compile time. Migration: add `appearance: z.optional(AppearanceConfigSchema)` (or the library's equivalent) to the slot schema, or use a loose object; a hand-written slot states its input type with `standardSchema<TOutput, TInput>`.
    - Messages changed. A key the recipe does not declare is an issue at that key (`Recipe 'x' does not accept view key 'y'. Allowed: ...`) and not an `unrecognized_keys` issue at the view. A bad `slotDefaults` entry reads `slotDefaults.<slot> is invalid: <path>: <message>`, with the message of the slot library and the offending key in the path (an unknown key a library reports on the object, as Zod does, is named at the key).

- Updated dependencies [[`61750ae`](https://github.com/schema-engine/schema-engine/commit/61750ae1c1739331d93590d4b745cff7847fdbcc), [`81147d5`](https://github.com/schema-engine/schema-engine/commit/81147d5b685f74ea6aecff1ec9cc803808ec284f), [`a2a2fc7`](https://github.com/schema-engine/schema-engine/commit/a2a2fc7360c46c2b25c78ed259173434a5ea8ccf), [`d021fff`](https://github.com/schema-engine/schema-engine/commit/d021fffd529ad3aeb8c90446de76a0d199dfa375), [`02f21c9`](https://github.com/schema-engine/schema-engine/commit/02f21c9ddc51e0b1d7712854707580f5b4e895d0), [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75), [`67e2556`](https://github.com/schema-engine/schema-engine/commit/67e25562959cc0242a56a59ec8d982f6e21fc93b), [`bdff897`](https://github.com/schema-engine/schema-engine/commit/bdff897952056ea0a4033e014692f5afc78c96d0), [`40a3d6f`](https://github.com/schema-engine/schema-engine/commit/40a3d6f8f111ebcd00cad0e72d056d5aa3710488), [`a719ba4`](https://github.com/schema-engine/schema-engine/commit/a719ba4e773cd3223bb7e4e6723e82a1006d1874), [`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0), [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75)]:
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
