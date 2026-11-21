# Form engine validation utilities

The engine exports reusable helpers for paths, effective rules, and validation.
`validateFormValues` takes `ValidationElementTree`, and
`collectStepFieldPaths` takes `ValidationStep`, both accepting structural read-only views or normalized snapshots.

- `collectStepFieldPaths(step, values)` keeps container paths whole and expands
  field templates for live array rows.
- `effectiveRulesFor` merges authored rules with default rules registered for a
  field type and adds a synthetic `required` rule when a conditional `require`
  constraint holds. For example, `accountType` on `contacts.0.taxId` resolves to
  `contacts.0.accountType`, so conditional rules use the current array row.
- `validateFieldValue` validates one field against the full nested values tree
  and its rendered path, returning the first issue message or `undefined`.
- `validateFormValues` validates named fields, filters to `names` when supplied,
  and writes failures into a nested error object with `setValueAtPath`. A field
  inside a fieldset or array whose `require` constraint holds is required, at any
  depth; `effectiveRulesFor` and `validateFieldValue` take that as
  `inheritedRequired`. A container's own `required` rule does not pass down.

For `validateFormValues`, omitted or empty `names` validates every named field.
A non-empty list validates only the requested paths and their descendants.

React and Radiant delegate to these helpers. `createStepNavigator` owns the wizard's
in-flight guard, the `step_leave` / `step_change` / `step_enter` order and `cancel`, which a
renderer calls on every step state reset so a navigation in flight neither writes state nor
dispatches after it; a renderer supplies its step state, step validation and trigger dispatch.
`collectStepActions` gives the actions a trigger dispatches on the current step: the
form's, then that step's (see [CONTEXT.md](../../../../CONTEXT.md#wizard-navigation)). `runSubmissionLifecycle` accepts either a
fixed context or a factory; use a factory when each submission trigger needs current form
values and validation state. Its optional `hasMatching(actions, trigger)` skips a trigger no
action answers, so no context is built for it; `ActionDispatcher.hasMatching` is the check. Its optional `onSubmit()` runs after the submit actions and before the success or error trigger; the function resolves with a `failure` instead of rejecting, and dispatches `form_submit_complete` once ([`createSubmissionGuard`](./submission-lifecycle.ts) admits one submission at a time). Its optional `onAction(action, data)` callback runs after each
successful `form_submit` action. If the callback rejects, that action becomes a fatal failure
and later submit actions stop before error and completion triggers run. Submit sequence entries are dispatched in order; grouped actions run concurrently. Each returned result carries its `actionId`.
`buildFormActionContext` takes nested `errors` and `touched` trees; a renderer that keys
them by flat field name expands them first. `validateFieldValue` and `validateFormValues`
require a `debounceScope` owned by the form.

The public usage examples are in the [forms package README](../../README.md#engine-validation).

## Form configuration validation

`validateForm` and `safeValidateForm` share one pipeline (`safeValidateFormConfig` in `lib/validate-form.ts`, which also re-exports the public pieces). The checks it
runs live next to it in `lib/validate-form/`: `issues.ts` (issue types and path helpers), `validation-error.ts`
(`FormValidationError`, `formatIssuePath`), `schema-issues.ts` (schema issues to form issues, including the
closest-union-branch choice), `grid-checks.ts` (named placement, areas and template checks), `parse-elements.ts`
(elements and actions) and `parse-view.ts` (the view recipe).
`validateForm` throws a `FormValidationError`; `safeValidateForm` returns `{ success: true, data }` or
`{ success: false, issues }` with the same issues. Each issue is `{ message, path }`, the path in config keys
and indexes (`['steps', 0, 'elements', 2, 'grid', 'width']`, `[]` for the whole form). See
[Validation errors](../../README.md#validation-errors) for the paths each check reports. Registration
checks made at build time (`buildFormEngine`) throw a plain `Error` naming the registration; they are not
form issues.

## Action context form state

`FormActionContextFormState` no longer accepts `touchedFields` or `isSubmitted`. Pass
`touched` and `submitCount`, both required, and nest `errors` and `touched` like the
values (`{ address: { street: … } }`, not `{ 'address.street': … }`). A React Hook Form
caller passes `touchedFields` as `touched`.

The form state has no `isValid`: the context's `isValid` is true when `errors` holds no error node (an
object with a string `type` or `message`; empty containers and array holes count for nothing),
in every renderer, and `form.checkValidity()` validates the current values without
recording errors (`checkFormValidity`). It skips fields a `show` or `hide` constraint hides, and
the fields inside a hidden container; a disabled field is still checked, as in a submission.

`submitCount` is the number of submit attempts since the form was last reset,
including attempts that failed validation. An attempt counts once its validation has
failed, or once its submission lifecycle has run, so the triggers of a submission
see the attempts before it. React passes React Hook Form's `submitCount`, which counts
this way. Radiant UI's form store keeps only a submitted flag, so Radiant counts the
`rui-invalid` events of its form and its finished submission lifecycles instead.

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
