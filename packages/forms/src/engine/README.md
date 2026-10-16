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
