# Form engine validation utilities

The engine exports reusable helpers for paths, effective rules, and validation.
`validateFormValues` takes `ValidationElementTree`, and
`collectStepFieldPaths` and `resolveParticipation` take `ValidationStep` (`id`, `elements` and `constraints`), all accepting structural read-only views or normalized snapshots.

- `collectStepFieldPaths(step, values)` keeps container paths whole and expands
  field templates for live array rows.
- `effectiveRulesFor` merges authored rules with default rules registered for a
  field type and adds a synthetic `required` rule when a conditional `require`
  constraint holds. For example, `accountType` on `contacts.0.taxId` resolves to
  `contacts.0.accountType`, so conditional rules use the current array row.
- `validateFieldValue` validates one field against the full nested values tree
  and its rendered path. It returns `{ issues, failures }`: `issues` has one entry for each rule the value
  fails, in rule order, with the rule's `$type` as `type`, its `id` as `ruleId`, its options as `params`, a fallback
  `message` and its `severity` (`'error'`, or `'warning'` for advice that never blocks); `superseded` is set when a rule's check was replaced by a later one before it ran (no result, not an issue); `failures` lists the
  rules that could not run (a `FormValidationFailure` naming the path and rule), which say nothing of the value.
- `validateFormValues` validates named fields, filters to `names` when supplied (an empty
  list validates nothing), and returns `{ issues, failures }` by dotted path, each path with every rule it
  fails. A field inside a fieldset or array whose `require` constraint holds is required, at any
  depth; `effectiveRulesFor` and `validateFieldValue` take that as
  `inheritedRequired`. A container's own `required` rule does not pass down. It skips the paths
  that take no part (`resolveParticipation`, below). `planFormValidation` and `runValidationPlan` are its two
  halves, for a caller that needs to know the planned paths before it runs.
- `resolveParticipation(steps, values)` is the one rule for "does this field count": it returns
  `{ excluded, skippedSteps, fields }`. A step its `show`/`hide` constraints hide is skipped and excludes the
  fields it holds; a field hidden by a `show` or `hide` constraint, a disabled field (authored or by a
  constraint) and everything inside them are excluded. Steps and fields resolve in order, in one pass that reads
  show, disable and require against the values with whatever was excluded before absent, so a skipped step that
  still holds `'yes'` cannot keep a later field shown or required. `fields` has the resulting `hidden`, `disabled` and
  `required` of each path that has a constraint (`foldFieldParticipation` folds the ancestors in). It is the only
  place constraints are evaluated for a form; the container keeps the result in its snapshot's `participation`.
  `validateFormValues` and `planFormValidation` take the form's `steps`.

For `validateFormValues`, omitted `names` validates every named field. A list validates only the
requested paths and their descendants, or only those paths with `exactNames`; an empty list validates nothing.

React and Radiant delegate to these helpers through [`createFormRuntime`](../runtime/README.md), which owns the
wizard's lock, the `step_leave` / `step_change` / `step_enter` order, the submission sequence and every action
dispatch; none of them is a renderer's to call. `step-machine.ts` holds its pure part: step state by id
(`startProgress`, `moveProgress`, `deriveStepStates`, `stepAfter`, `stepBefore`, `stepsWithErrors`), where only
`visited` and `complete` are stored and `skipped` and `invalid` are derived.
`collectStepActions(config, stepId)` gives the actions a trigger dispatches on the current step: the
form's, then that step's (see [CONTEXT.md](../../../../CONTEXT.md#wizard-navigation)).
`buildFormActionContext` takes `errors` and `touched` by dotted path, and the current step as its id, its
position among the active steps and their number; the context carries `stepId`, `currentStep` and `totalSteps`. `validateFieldValue` and `validateFormValues`
require a `debounceScope` owned by the form.

The public usage examples are in the [forms package README](../../README.md#engine-validation).

## Form configuration validation

`validateForm` and `safeValidateForm` share one pipeline (`safeValidateFormConfig` in `lib/validate-form.ts`, which also re-exports the public pieces). The checks it
runs live next to it in `lib/validate-form/`: `step-checks.ts` (unique step ids; a step constraint reads only non-row fields of earlier steps, so the first step has none), `issues.ts` (issue types and path helpers), `validation-error.ts`
(`FormValidationError`; `formatIssuePath` comes from `@schema-engine/registry`), `schema-issues.ts` (schema issues to form issues, including the
closest-union-branch choice), `grid-checks.ts` (named placement, areas and template checks), `parse-elements.ts`
(elements and actions) and `parse-view.ts` (the view recipe).
`validateForm` throws a `FormValidationError`; `safeValidateForm` returns `{ success: true, data }` or
`{ success: false, issues }` with the same issues. Each issue is `{ message, path }`, the path in config keys
and indexes (`['steps', 0, 'elements', 2, 'grid', 'width']`, `[]` for the whole form). See
[Validation errors](../../README.md#validation-errors) for the paths each check reports. Registration
checks made at build time (`buildFormEngine`) throw a plain `Error` naming the registration; they are not
form issues.

## Requests

`createFormEngine({ fetch?, csrf? })`: `fetch` defaults to the global one, and every request the engine makes goes
through it (today the `async` validation rule, built by the engine's validation registry, `registry.fetch`).
`engine.fetch` is that function with the CSRF policy applied, and `engine.getCsrf()` the policy, for a binding that
adds a hidden input to a native post. `extend` inherits both. See [CSRF](../csrf/README.md).

## Submission schema

`FormEngine.submissionSchema(config)` returns the Standard Schema (and Standard JSON Schema, where the value schemas
export one) of the values a submission of `config` holds. `submission-schema.ts` reads each leaf's schema from its
registration's `value(element)`, and `lib/submission-shape.ts` supplies the structure, the same walk the container prunes
its submitted values with. `builder/form-values.ts` (`ValuesOf`) is its type-level twin: it reads the literal config
and the engine's value entries (`TOutputs['values']`), and `defineForm` returns the normalized config carrying the
result. Its `~standard.jsonSchema` `input()` and `output()` throw for a value schema that has no JSON Schema. `validateForm(json, { values })` binds an application schema, which the normalized config carries for the runtime.

## Action context form state

`FormActionContextFormState` no longer accepts `touchedFields` or `isSubmitted`. Pass
`fetch` (the engine's), `isValid`, `touched` and `submitCount`, all required, key `errors` and `touched` by dotted path
(`{ 'address.street': … }`). The container's snapshot already has them flat.

The form state carries `isValid`, the container's `snapshot.isValid`: true when no error is recorded for a
path that takes part, in every renderer, and the context passes it on as it is. A renderer without a container
derives it from the errors it has. `form.checkValidity()` validates the current values without
recording errors. It skips fields a `show` or `hide` constraint hides, and
the fields inside a hidden container; a disabled field is still checked, as in a submission.

`submitCount` is the number of submit attempts since the form was last reset,
including attempts that failed validation. An attempt counts once its validation has
failed, or once its submission lifecycle has run, so the triggers of a submission
see the attempts before it. React passes the provider's own `submitCount`, which counts
this way, except that a submission an edit overtook is not counted. Radiant's `se-form-instance` counts its own attempts.

## Schema artifacts and extension

A `catalog` passed to `createFormEngine` is a base: the engine copies it and writes
every registration's entry over it, keyed `${componentType}:${$type}`
(`SchemaMetadataCatalog.entryId`). A registration's entry replaces any entry with that
id wholesale, schema, title and description included, and the supplied catalog is not
mutated. `extend` rebuilds the catalog the same way from the source engine's catalog,
or from an explicit `catalog` passed to `extend`, so custom entries carry over and
added or overridden registrations replace theirs without touching the source engine.
The JSON Schema export reads the schema of every registration kind (element, action, rule, recipe slot) by one rule, `resolveExportSchema` in `lib/export-schema.ts`: a Zod schema through the Zod converter, any other schema that sets `~standard.jsonSchema` as what it returns, and anything else as an open object. Zod comes first because the export composes Zod schemas (closed appearance, rules, the action envelope) before converting them, which classic Zod's own `~standard.jsonSchema` output cannot take part in. `createExportConversion` writes each other schema into the Zod conversion through its `override`, and `createJSONSchemaEmbedder` (from `@schema-engine/registry/json-schema`, which `exportTreeSchema` shares) drops its `$schema`, moves a schema whose `$ref`s point into itself to where they resolve (the document's definitions, or a collection entry of its own) and keeps the catalog annotations a document lists where the schema does not set them. A converter that throws for the target lists the schema by its open object and logs a warning. `submissionSchema` reads value schemas by the same rule and embedder.

The children of a container are typed after the conversion, for every source: `child-slots.ts` finds each container's definition by its catalog id (`element:<$type>`, in the document's definitions or a collection's entries) and calls the registry's `replaceChildSlot` with the union of its `childPaths[0].accepts`, or of every element without one, as `$ref`s the way that output refers to an entry. An element the export cannot read is listed by an open envelope that holds its `elements` as an optional list, so the same step types it, and it is an entry of its own like any other element. A name in `accepts` that no element registers throws `RegistryError` `'unknown-accepted-type'` before any reference is written, and a slot that is nullable or behind a union throws `'unreachable-child-path'`. The engine exposes no Zod object: validation is `validateForm` and `safeValidateForm`, and export is `generateFormConfigSchema`, `generateJSONSchemaCollection`, `generateActionConfigSchema` and the two Standard JSON Schema getters.

`FormEngine` is exported as a type only, so `createFormEngine` is the one way to make an engine and no constructor reaches `EngineRegistries`, which holds the schema artifacts. Every registration kind that the export cannot read (element, action, recipe) is listed by an open envelope that is a definition of the document and an entry of the collection, and `generateActionConfigSchema` writes the envelope for an open action. A container declares `list: true` on its child path, so `safeParseTree` reports `registry/not-a-list` for a value that is not an array and `child-slots.ts` types the slot as an array for every source.

A target is a `JSONSchemaTarget` from `@schema-engine/registry`, the Standard JSON Schema names (`'draft-2020-12'`, `'draft-07'`, `'draft-04'`, `'openapi-3.0'`), in every public API. Zod takes the same names, so they reach the Zod converter as they are; the export needs Zod 4.5.0, the floor of the peer range: the document tests fail on 4.4.3, which does not write the catalog ids as `$defs` entries. A target outside the set throws before any schema is converted: `generateActionConfigSchema` checks it with `assertJSONSchemaTarget` first (so it throws for an action the engine lacks too), the Standard converters narrow with it before they call a generator, and `generateFormConfigSchema` and `generateJSONSchemaCollection` throw from `createJSONSchemaEmbedder`, which every conversion creates first. A submission supports three of the four and says so. A `'draft-04'` export names each collection entry and the form config document by `id`, since Zod writes `$id` for every target and a draft-04 validator ignores it (`generateZodJSONSchemaCollection` moves it, `generateZodJSONSchemaDocument` writes `id`); `startsResource` and `idKeyword` from `@schema-engine/registry/json-schema` read a resource by the target's keyword.
The layout theme (`getLayout()`: grid vocabulary, appearance axes held in a registry, one id and one stylesheet; the catalog and JSON Schema export list each axis and its values, and an element's or recipe slot's `appearance` in the export lists only the axes it declares) is inherited, and is taken as given when the engine was created with a compiled theme. JSON Schema generation uses `StandardJSONSchemaV1`
from `@standard-schema/spec` and keeps the existing forms vendor, schema ids
and input/output documents.

Container registrations declare `childPaths: [{ keys: ['elements'], list: true }]` (forms fixes the key; `createFormEngine` throws for any other
child path, for more than one and for one on a `static` element) and, for rows, `containerKind: 'array'` (`'object'` is the default).
`value` is required exactly when there is no `childPaths`. The element walk of `validateForm` is the registry's `safeParseTree`,
one call per top-level element over an internal lookup that runs each schema without the element's `appearance`, so children are read
as authored with the registry's slot rules (a parent schema that drops, renames, resizes or defaults `elements` to a non-empty list is a
`RegistryError` `'schema-breaks-child-path'`, a reorder is ignored, and `accepts` gives `registry/not-accepted`). A pass over the returned tree
then runs the checks forms adds: reserved names, rules, grid and appearance, which it reads from the authored node at `ParsedNode.path`.
The pass runs on the tree from either branch of the result (`data` on success, the partial tree's `output` on failure), so one call reports every
issue: the registry's first, then forms' (rules, name, grid, appearance), parent before children, document order, and a node's children are
checked whether or not it had an issue. Placement, step constraints and the payload check read a retained tree built from the registry's `children`
only (`RetainedElement`), which keeps an element with an issue of its own and cannot hold a cycle or a rejected node; `items` is the clean trees, for
normalization only. The envelope leaves a step's elements and the form's and steps' actions as they arrived (`z.unknown()`), so a top-level element without a `$type` is that
element's `registry/missing-type` issue and a cycle is reported at its first repeat. An
element without `childPaths` that holds `elements` is an issue at its `elements` key; its children are not checked, its other checks still run and its retained config has no `elements`.
Normalization stores the container kind on the frozen element without adding JSON
keys. `collectFieldDefaults`, `collectInitialValues`, `createArrayRowDefault`
and `walkNamedElements` detect arrays by the metadata rather than a widget `$type`. A new row
starts from `createArrayRowDefault`: child `defaultValue`s with the container's
`initialValues` merged over them (see [CONTEXT.md](../../../../CONTEXT.md#array-rows)). A one-child array whose child is a leaf and whose seeds are not object-shaped
uses scalar item paths (`usesScalarArrayItem`); other arrays join child names
onto each item. Validation expands scalar child rules to each
live item path (`tags.0`, `tags.1`) while keeping the container path (`tags`)
available for container rules. Pass normalized elements to these helpers so
custom array widgets receive the same path and default behavior as built-ins.

## Registration storage

`buildFormEngine` stores elements, recipes, and actions in three read-only
registries from `@schema-engine/registry`, built with `createRegistry`, and validation rules in a
fourth, built with `createRegistry('Validation', ...)` (see `createValidationRegistry`). Each
registry checks the winning registration's Standard Schema once, at build, and throws naming
the offending kind and `$type` (for example `Element 'note' schema must implement
Standard Schema`). Later duplicates replace earlier registrations without a
warning. A registration overridden later in the list is skipped by every build
check (schema, recipe slots, declared axes). The registries and the copies they
store are frozen and the registration objects you pass stay untouched, so
`FormEngine` shares its registries with engines built by `extend` without copying. It exposes them as the
readonly properties `elements`, `recipes`, `actions` and `validations`, which serve renderers and action
dispatch (`new ActionDispatcher(engine.actions)`). Their `all()` and `keys()` return frozen arrays.

The validation registry is built from the built-in rules, then the `validations` of each winning
element in the element registry's order (a replaced `$type` keeps its first position, so for
[A1, B, A2] where all declare the same validation `$type`, B's validation wins), then
`createFormEngine({ validations })`. `FormEngine` keeps the `validations`
option so `extend` rebuilds the registry from it. The per-field-type default rules (`defaultFor`) are
derived from the stored registrations at build, not kept as mutable state.

Validation helpers accept structural, read-only element views as well as normalized
snapshots. Both renderers use these same helpers, the step machine and
step navigator, the submission lifecycle and the context builder. `BuilderActionBaseContext.form` requires
`reset`, `setValue`, `getValue`, `validate` and `checkValidity`; it does not expose renderer methods.

Conditional `require` references participate in the shared validation dependency
index, so changing a controlling value revalidates fields with visible errors.
