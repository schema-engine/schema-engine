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
  and writes failures into a nested error object with `setValueAtPath`.

For `validateFormValues`, omitted or empty `names` validates every named field.
A non-empty list validates only the requested paths and their descendants.

React and Radiant delegate to these helpers. `runSubmissionLifecycle` accepts either a
fixed context or a factory; use a factory when each submission trigger needs current form
values and validation state.

The public usage examples are in the [forms package README](../../README.md#engine-validation).

## Schema artifacts and extension

`extend` inherits the source engine's schema metadata catalog and compiled grid.
An explicit `catalog` on `extend` replaces that catalog. JSON Schema generation
uses `StandardJSONSchemaV1` from `@standard-schema/spec` and keeps the existing
forms vendor, schema ids, targets and input/output documents. Inherited
catalogs are copied; schemas for added or overridden registrations are updated
without mutating the source engine's catalog.

Container registrations declare `containerKind: 'array'` (or `'object'`).
Normalization stores that metadata on the frozen element without adding JSON
keys. `collectFieldDefaults` and `walkNamedElements` read the metadata rather
than a widget `$type`. A one-child array uses scalar item paths; other arrays
join child names onto each item. Validation expands scalar child rules to each
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
snapshots. The React adapter uses these same helpers and the step machine,
submission lifecycle and context builder. `BuilderActionBaseContext.form` requires
`reset`, `setValue`, `getValue` and `validate`; it does not expose renderer methods.

Conditional `require` references participate in the shared validation dependency
index, so changing a controlling value revalidates fields with visible errors.
