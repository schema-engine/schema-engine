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
values and validation state. Its optional `onAction(action, data)` callback runs after each
successful `form_submit` action. If the callback rejects, that action becomes a fatal failure
and later submit actions stop before error and completion triggers run. Submit sequence entries are dispatched in order; grouped actions run concurrently. Each returned result carries its `actionId`.
`buildFormActionContext` takes nested `errors` and `touched` trees; a renderer that keys
them by flat field name expands them first. `validateFieldValue` and `validateFormValues`
require a `debounceScope` owned by the form.

The public usage examples are in the [forms package README](../../README.md#engine-validation).

## Action context form state

`FormActionContextFormState` no longer accepts `touchedFields` or `isSubmitted`. Pass
`touched` and `submitCount`, both required, and nest `errors` and `touched` like the
values (`{ address: { street: … } }`, not `{ 'address.street': … }`). A React Hook Form
caller passes `touchedFields` as `touched`.

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
The compiled grid and the compiled appearance vocabulary (`getAppearance()`: axes, token stylesheet, theme id) are inherited. JSON Schema generation uses `StandardJSONSchemaV1`
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

`buildFormEngine` checks each supplied Standard Schema once, then stores elements,
recipes, and actions in Maps keyed by `$type`. Later duplicates replace earlier
registrations. `FormEngine` takes an isolated Map snapshot, and its lookup methods
serve renderers and action dispatch. Construction does not instantiate temporary
component or action registries.

Validation helpers accept structural, read-only element views as well as normalized
snapshots. Both renderers use these same helpers, the step machine and
step navigator, the submission lifecycle and the context builder. `BuilderActionBaseContext.form` requires
`reset`, `setValue`, `getValue` and `validate`; it does not expose renderer methods.

Conditional `require` references participate in the shared validation dependency
index, so changing a controlling value revalidates fields with visible errors.
