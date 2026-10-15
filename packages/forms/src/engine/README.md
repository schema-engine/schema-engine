# Form engine validation utilities

The engine exports reusable helpers for paths, effective rules, and validation.
`validateFormValues` takes `ValidationElementTree`, and
`collectStepFieldPaths` takes `ValidationStep`, both shaped from the engine's
normalized form model.

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

The React and Radiant renderers have not adopted these helpers yet. Their
adoption is tracked by [#138](https://github.com/andeeplus/schema-engine/issues/138)
and [#133](https://github.com/andeeplus/schema-engine/issues/133), respectively.

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
