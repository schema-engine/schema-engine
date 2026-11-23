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
(`FormValidationError`, `formatIssuePath`), `schema-issues.ts` (schema issues to form issues, including the
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
The layout theme (`getLayout()`: grid vocabulary, appearance axes held in a registry, one id and one stylesheet; the catalog and JSON Schema export list each axis and its values, and an element's or recipe slot's `appearance` in the export lists only the axes it declares) is inherited, and is taken as given when the engine was created with a compiled theme. JSON Schema generation uses `StandardJSONSchemaV1`
from `@standard-schema/spec` and keeps the existing forms vendor, schema ids, targets
and input/output documents.

Container registrations declare `containerKind: 'array'` (or `'object'`).
Normalization stores that metadata on the frozen element without adding JSON
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
`FormEngine` shares its registries with engines built by `extend` without copying, and its lookup
methods serve renderers and action dispatch. The `getAll*` and `get*Ids` methods
return fresh arrays.

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
